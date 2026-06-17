# Reflection on the VectorMesh Hackathon

## Summary

In this hackathon I worked on a multi-label classification task for Dutch legal documents. The goal was to predict which legal facts apply to a document. Each document could have more than one correct label, so the problem was not a simple single-class classification task. I treated it as a legal document classification problem where both frequent and rare labels matter.

The final solution combined three parts. First, I used an attention-based neural model as the main classifier. Second, I changed the training and thresholding strategy to focus more on macro-F1, because the earlier models were already quite strong on micro-F1 but still weak on rare labels. Third, I added a small legal phrase router for a group of very similar labels around `art. 7:3 BW`, `WVG`, and `Omgevingswet`.

The final validation result was **0.8647 micro-F1** and **0.6503 macro-F1**. The biggest improvement was in macro-F1. The best plain attention model had **0.5618 macro-F1**, while the final model reached **0.6503 macro-F1**. This was important because macro-F1 better reflects whether the model is doing something useful for less frequent labels.

## Understanding the Task

The data consists of Dutch legal documents with legal fact labels. There are 32 possible labels. Some labels are common, while others appear only rarely. This imbalance made the task more difficult than it first appeared. A model can score well overall by learning the frequent labels, but still fail on rare but legally important labels.

The dataset was split into a training part, a calibration part, and an official validation part. The training part was used to fit the models. The calibration part was used to choose thresholds and small post-processing parameters. The official validation part was kept as the final check for the reported scores.

The split sizes were:

| Split | Documents | Role |
|---|---:|---|
| Training data before split | 15,532 | Available labelled training examples |
| Training core | 12,426 | Used for fitting models |
| Calibration split | 3,106 | Used for thresholds and small tuning decisions |
| Official validation | 1,942 | Used for final reported validation scores |

This amount of data was enough to train useful models, but the imbalance between labels remained a major issue. Some labels had very few validation examples, which made them hard to learn and hard to evaluate reliably.

## Why I Changed the Main Focus to Macro-F1

At the beginning, I mostly looked at micro-F1. This metric is useful because it summarizes the overall number of true positives, false positives, and false negatives. However, micro-F1 gives much more weight to frequent labels. During the experiments, it became clear that a model could have a good micro-F1 score while still performing badly on rare labels.

This is why I started treating macro-F1 as the more interesting research metric. Macro-F1 calculates F1 per label and then averages across labels. This means that weak performance on rare labels becomes visible. For a legal classification task, this seemed more appropriate, because rare legal facts can still be important.

I did not ignore micro-F1 completely. I used it as a guardrail. Improving macro-F1 would not be useful if the model started predicting too many labels and damaged the overall classification quality. The best result improved both metrics, which made the final solution more convincing.

## Baseline Models

The first models were relatively simple. I compared different ways of aggregating document chunk embeddings and then predicting the 32 labels. The main baseline was a masked mean model, which averages the available chunks and then uses a small neural network. This model was a good starting point because it was simple and stable.

The masked mean baseline reached **0.8489 micro-F1** and **0.4093 macro-F1** on validation. The micro-F1 score was already fairly strong, but the macro-F1 score showed that rare labels were still a problem.

The attention model performed better. Instead of treating all chunks equally, it learned to give more weight to more relevant parts of the document. This made sense for legal documents, because important legal facts are often mentioned in specific clauses or phrases rather than being spread evenly through the whole text. The best attention model reached **0.8544 micro-F1** and **0.5618 macro-F1**.

I also tested a mixture-of-experts model. The idea was that different experts might specialize in different legal patterns. In practice, it did not improve the result. The best MoE run reached **0.8246 micro-F1** and **0.3932 macro-F1**, which was worse than the attention model. This was a useful result, because it showed that a more complex model was not automatically better.

| Model | Validation micro-F1 | Validation macro-F1 | Main conclusion |
|---|---:|---:|---|
| Masked mean baseline | 0.8489 | 0.4093 | Strong overall, weak on rare labels |
| MoE | 0.8246 | 0.3932 | More complex, but worse here |
| Attention | 0.8544 | 0.5618 | Best standard neural model |

## Reranker and Label Graph Experiments

After the first models, I tried to make the system more creative than just comparing neural architectures. One idea was a two-stage reranker. The first-stage models produced probabilities for each label, and then a small calibrator tried to learn which labels should be kept. The motivation was that different models might make different errors, so a second-stage model could learn from their disagreement.

This idea was reasonable, but the results were not strong. The reranker reached **0.8518 micro-F1** and **0.4120 macro-F1**. It did not beat the attention model, especially on macro-F1. My interpretation is that the reranker did not have enough useful independent signal. It mostly received probabilities from models that were already making similar mistakes.

I also tried a label graph correction. The idea was that legal labels are not completely independent. Some labels often appear together, and some are more likely when another legal fact is already present. I estimated these relations from the training data and used them to slightly adjust probabilities.

This gave a very small micro-F1 gain, from **0.8544** to **0.8556**, but macro-F1 dropped to **0.5360**. This suggested that co-occurrence information exists, but the correction was too general. It helped some frequent patterns but did not solve the rare-label problem. I decided not to use it as the final method.

## Macro-Focused Model

The most important improvement came from training the attention model with more focus on rare labels. I used positive class weighting so that mistakes on rare labels counted more during training. The weights were capped, because otherwise the model could become too aggressive and start predicting rare labels too often.

This was combined with per-label thresholding. A global threshold is simple, but it is not ideal when labels have very different frequencies and probability distributions. Some labels need a lower threshold to get any recall, while common labels can use a higher threshold. The thresholds were selected on the calibration split, not directly on the validation set.

This macro-focused attention model reached **0.8588 micro-F1** and **0.6304 macro-F1**. Compared with the best plain attention model, that was a macro-F1 improvement of **+0.0685**, while micro-F1 also increased by **+0.0044**. This was the first major breakthrough in the project.

The result also changed my understanding of the task. The problem was not mainly that the base architecture was too weak. The attention model was already good. The larger issue was that the training and thresholding setup favored frequent labels too much. Once I optimized more directly for rare-label behaviour, the model became much stronger.

## Error Analysis

After the macro-focused model, I looked more closely at per-label results. This was useful because the average scores did not tell the whole story. Some labels improved a lot, while others remained very weak.

Several labels were especially interesting:

| Label | Legal fact | What happened |
|---:|---|---|
| 8 | `koopovereenkomst (beeindiging)` | Still weak, with many missed examples |
| 23 | `vervallen verklaring beperkt zakelijk recht` | Still zero F1 |
| 26 | `overdracht om niet` | Still zero F1 |
| 28 | `koopovereenkomst, art. 7:3 BW en 10 WVG` | High recall, but too many false positives |
| 29 | `koopovereenkomst, art. 7:3 BW` | Often confused with related labels |
| 31 | `koopovereenkomst, art. 7:3 BW en 9.9 Omgevingswet` | Often confused with related labels |

At first, labels 23 and 26 looked like good candidates for phrase-based feature engineering. For example, phrases like `overdracht om niet`, `schenking`, `vervallen`, or `zakelijk recht` seemed relevant. However, these phrases were not clean enough. They also appeared in documents where the target label was not present. A simple keyword rule would probably create many false positives.

The more promising pattern was the confusion between labels 28, 29, and 31. These labels all involve `art. 7:3 BW`, but they differ in the additional legal context. Label 28 is connected to `WVG` or `voorkeursrecht`, while label 31 is connected to `Omgevingswet` and `9.9`. This gave a clearer legal reason for a small rule-based correction.

## Rare Legal Phrase Router

The final post-processing step was a small legal phrase router. It did not replace the neural model. It only adjusted probabilities for a few confusing labels where the legal text gave a clear signal.

The router considered two types of signal. The first was rare-label phrase boosting for labels 23 and 26. The second was routing between labels 28, 29, and 31 based on phrases such as `WVG`, `voorkeursrecht`, `Omgevingswet`, and `9.9`.

The calibration split selected the following behaviour:

| Parameter | Selected value | Meaning |
|---|---:|---|
| Rare-label boost | 0.00 | Do not boost labels 23 and 26 |
| Router boost | 0.25 | Increase the most likely legal subtype |
| Router suppression | 0.15 | Suppress conflicting subtypes |

This was a good outcome because it prevented me from forcing a weak idea into the final model. The calibration process rejected the rare-label phrase boost. So labels 23 and 26 remained unsolved, but the final model avoided adding a noisy keyword trick.

The router did help the `art. 7:3` group. The final validation score became **0.8647 micro-F1** and **0.6503 macro-F1**. Compared with the macro-focused attention model, this was a further improvement of **+0.0059 micro-F1** and **+0.0199 macro-F1**.

The biggest per-label improvements were:

| Label | Before router F1 | After router F1 | Interpretation |
|---:|---:|---:|---|
| 28 | 0.500 | 0.857 | Much better separation of WVG-related cases |
| 29 | 0.578 | 0.622 | Small improvement |
| 31 | 0.417 | 0.842 | Much better separation of Omgevingswet-related cases |

The final router did not fix every problem. Labels 23 and 26 still had zero F1 on validation. But it did improve a real and understandable legal confusion pattern, which made it a useful final contribution.

## Final Results

The final result was built step by step. The table below shows the main stages:

| Stage | Validation micro-F1 | Validation macro-F1 |
|---|---:|---:|
| Masked mean baseline | 0.8489 | 0.4093 |
| Best attention model | 0.8544 | 0.5618 |
| Reranker | 0.8518 | 0.4120 |
| Label graph corrector | 0.8556 | 0.5360 |
| Macro-focused attention | 0.8588 | 0.6304 |
| Final phrase router | 0.8647 | 0.6503 |

The most important comparison is between the best plain attention model and the final model. Micro-F1 improved from **0.8544** to **0.8647**. Macro-F1 improved from **0.5618** to **0.6503**. The macro-F1 improvement is especially meaningful because it shows better performance across labels, not only on the most frequent labels.

## Overfitting and Reliability

I tried to keep the evaluation reasonably honest. The model was trained on the training core. Thresholds and small correction parameters were chosen on the calibration split. The official validation set was used to report the final score.

There is still a limitation here. I did inspect validation diagnostics during the project, and that influenced what I tried next. This means the validation set was not a completely untouched test set in the strictest research sense. However, the exact numerical parameters of the final router were chosen on calibration, not directly on validation. Also, the final result improved both micro-F1 and macro-F1, which makes it less likely that the improvement is only a strange metric trade-off.

I also think it is important that several ideas were allowed to fail. MoE did not help, so I did not present it as the main solution. The reranker did not help enough. The label graph was interesting but not the best. The rare phrase boost for labels 23 and 26 was rejected. These negative results made the final conclusion more believable.

## Limitations

The main limitation is still rare-label performance. Labels 23 and 26 remained at zero F1. Their validation support was very small, so this is difficult to solve reliably. It may require more examples, better document-level text features, or more domain-specific analysis.

Another limitation is that the final router is manually designed. It is interpretable and legally motivated, which is useful, but it was inspired by error analysis. A stronger evaluation would use a separate final test set after all design decisions are frozen.

The model also depends on the quality of the cached embeddings. I did not fine-tune a language model end-to-end. Fine-tuning might improve performance, but it would also make the solution heavier and harder to compare with the provided setup.

## Final Reflection

The main lesson from this project is that the best improvement did not come from simply making the model more complicated. The MoE model sounded more advanced, but it performed worse. The reranker was a reasonable idea, but it did not add enough useful information. The useful progress came from looking carefully at the metric, understanding the label imbalance, and then making changes that matched the actual errors.

The final solution has a clear story. Attention helped the model focus on relevant document chunks. Cost-sensitive training and per-label thresholds helped macro-F1 and rare-label behaviour. The phrase router then improved a specific legal confusion pattern between closely related `art. 7:3` labels.

Overall, I think the final model is a solid result for this task. It is not perfect, and some rare labels remain unresolved, but the progression from baseline to final model is clear. The final score of **0.8647 micro-F1** and **0.6503 macro-F1** shows that the model improved both overall quality and label-balanced performance. The most valuable part of the work was learning that error analysis and metric choice mattered more than adding unnecessary model complexity.
