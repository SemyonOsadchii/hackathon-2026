"""Residual and gating components for skip connections and gated transformations."""

from typing import Optional

import torch
import torch.nn as nn
import torch.nn.functional as F
from beartype import beartype
from jaxtyping import Float, jaxtyped
from torch import Tensor

from vectormesh.types import BaseComponent


class Skip(BaseComponent):
    """Residual skip connection: output = batchnorm(transform(x) + projection(x))
    - transform is the pipeline we want to apply to the input
    - in_size is the dimensionality of the input; we need this for the layernorm
    - projection is an optional pipeline, eg a Linear(in_size, out_size) if the
    transform changes the dimensionality.
    """

    transform: nn.Module
    projection: Optional[nn.Module]
    layernorm: nn.LayerNorm

    def __init__(
        self,
        transform: nn.Module,
        in_size: int,
        projection: Optional[nn.Module] = None,
    ):
        super().__init__()
        self.transform = transform
        self.projection = projection
        self.layernorm = nn.LayerNorm(in_size)

    @jaxtyped(typechecker=beartype)
    def forward(self, tensors: Float[Tensor, "..."]) -> Float[Tensor, "..."]:
        # pre-norm (instead of post-norm) improves stability
        tensors = self.layernorm(tensors)
        residual = self.projection(tensors) if self.projection else tensors
        transformed = self.transform(tensors)
        return transformed + residual


class Gate(BaseComponent):
    """Simple gating: output = sigmoid(W·x) * x"""

    def __init__(self, hidden_size: int):
        super().__init__()
        self.project = nn.Linear(hidden_size, hidden_size)

    @jaxtyped(typechecker=beartype)
    def forward(
        self, tensors: Float[Tensor, "batch dim"]
    ) -> Float[Tensor, "batch dim"]:
        return F.sigmoid(self.project(tensors)) * tensors


class Highway(BaseComponent):
    """Highway network: G * T(x) + (1-G) * x"""

    def __init__(self, transform: nn.Module, hidden_size: int):
        super().__init__()
        self.transform = transform
        self.project = nn.Linear(hidden_size, hidden_size)
        self.norm = nn.LayerNorm(hidden_size)

    @jaxtyped(typechecker=beartype)
    def forward(
        self, tensors: Float[Tensor, "batch dim"]
    ) -> Float[Tensor, "batch dim"]:
        # pre-norm (instead of post-norm) improves stability
        tensors = self.norm(tensors)
        gate = F.sigmoid(self.project(tensors))
        transformed = self.transform(tensors)
        return gate * transformed + (1 - gate) * tensors


class MoE(BaseComponent):
    """Dense mixture of experts: a softmax-weighted blend of all experts.

    The natural "multi-gate" generalisation of the gating family in this module::

        Gate:     sigmoid(Wx) * x                    # 1 gate,  1 transform
        Highway:  g * T(x) + (1 - g) * x             # 1 gate,  2 experts (T, identity)
        MoE:      sum_i softmax(Wx)_i * expert_i(x)  # N gates, N experts

    This is essentially the original Jacobs & Jordan (Adaptive mixtures of local experts, 1991) formulation, not optimized for
    thousands of experts like the Shazeer et al. (2017) paper.

    Routing is per position, so the layer accepts both (batch, hidden) and
    (batch, seq, hidden) inputs: the same softmax-blend is applied along the
    last axis at every position.

    Experts must map (..., hidden_size) to (..., out_size)

    Args:
        experts: modules mapping (..., hidden_size) -> (..., out_size).
        hidden_size: input dimensionality (also the router input size).
        out_size: output dimensionality of each expert.
    """

    def __init__(
        self, experts: list[nn.Module], hidden_size: int, out_size: int
    ) -> None:
        super().__init__()
        self.experts = nn.ModuleList(experts)
        self.router = nn.Linear(hidden_size, len(experts))
        self.hidden_size = hidden_size
        self.out_size = out_size
        self.num_experts = len(experts)

    @jaxtyped(typechecker=beartype)
    def forward(
        self, tensors: Float[Tensor, "... {self.hidden_size}"]
    ) -> Float[Tensor, "... {self.out_size}"]:
        # Per-position gates over experts; works for 2D and 3D alike.
        gates = F.softmax(self.router(tensors), dim=-1)  # (..., num_experts)
        # stack experts on dim -2: (..., num_experts, out_size)
        expert_outputs = torch.stack([e(tensors) for e in self.experts], dim=-2)
        # sum over experts weighted by gates: (..., out_size)
        return (gates.unsqueeze(-1) * expert_outputs).sum(dim=-2)
