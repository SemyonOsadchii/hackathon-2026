const detailContent = {
  "masked-mean": {
    kicker: "Experiment 01",
    title: "Masked mean baseline",
    sections: [
      {
        heading: "What I tried",
        text: "I used this as my first serious baseline because it was simple and easy to trust. The model averaged the available document chunk embeddings and then predicted the 32 labels with a small neural network."
      },
      {
        heading: "What happened",
        text: "The result was already quite strong on micro-F1, which meant the basic embedding setup was useful. At the same time, macro-F1 was much lower, so the model was clearly better at common labels than rare labels."
      },
      {
        heading: "What I learned",
        text: "This baseline changed how I looked at the task. It showed that the main problem was not only building a model that works overall, but building one that does not ignore smaller legal fact classes."
      }
    ]
  },
  attention: {
    kicker: "Experiment 02",
    title: "Attention model",
    sections: [
      {
        heading: "What I tried",
        text: "I replaced simple averaging with attention over document chunks. The idea was that not every chunk should matter equally, especially in legal documents where one clause can contain the important signal."
      },
      {
        heading: "What happened",
        text: "This became the best normal neural architecture in my experiments. It improved macro-F1 a lot compared with masked mean, which suggested that the model was using more specific parts of the documents."
      },
      {
        heading: "What I learned",
        text: "The attention result was important because it gave me a strong base model. Later improvements worked better when I treated attention as the main classifier and focused on training, thresholds, and error analysis around it."
      }
    ]
  },
  moe: {
    kicker: "Experiment 03",
    title: "Mixture of experts",
    sections: [
      {
        heading: "What I expected",
        text: "I expected the mixture-of-experts model to help because different experts might specialize in different legal patterns. On paper this sounded more creative than a single classifier."
      },
      {
        heading: "What happened",
        text: "In practice, it performed worse than the attention model. The model became more complex, but the extra complexity did not translate into better validation F1."
      },
      {
        heading: "What I learned",
        text: "I kept this result in the report because it is a useful negative result. It reminded me that a more advanced architecture is not automatically better if it does not match the actual error pattern."
      }
    ]
  },
  reranker: {
    kicker: "Experiment 04",
    title: "LegalEvidenceReranker",
    sections: [
      {
        heading: "What I tried",
        text: "I tried a two-stage setup where first-stage models produced candidate probabilities and a small reranker decided which labels should remain. The motivation was that model disagreement could become extra evidence."
      },
      {
        heading: "What happened",
        text: "The reranker did not beat the attention model. It improved only a little against the simplest baseline and was weak on macro-F1."
      },
      {
        heading: "What I learned",
        text: "My interpretation is that the reranker did not receive enough independent information. It mostly saw probabilities from models that were already making similar mistakes, so it could not fix the important rare-label errors."
      }
    ]
  },
  "label-graph": {
    kicker: "Experiment 05",
    title: "Label graph correction",
    sections: [
      {
        heading: "What I tried",
        text: "I estimated simple label relations from the training data. The idea was that legal facts are not fully independent, so one predicted label could slightly support or suppress another."
      },
      {
        heading: "What happened",
        text: "This gave a small micro-F1 improvement, but macro-F1 dropped. That meant it helped some common co-occurrence patterns but did not solve the rare-label problem."
      },
      {
        heading: "What I learned",
        text: "The graph idea was reasonable, but too general. For this task I needed a more careful correction that was tied to a specific legal confusion, not a broad statistical adjustment between many labels."
      }
    ]
  },
  "macro-attention": {
    kicker: "Experiment 06",
    title: "Macro-focused attention",
    sections: [
      {
        heading: "What I changed",
        text: "I kept the attention architecture but changed the training setup. I used positive class weighting and per-label thresholds so that rare labels had a better chance to be learned and selected."
      },
      {
        heading: "What happened",
        text: "This was the main breakthrough. Macro-F1 increased strongly while micro-F1 also improved, so the model did not just trade overall quality for rare-label recall."
      },
      {
        heading: "What I learned",
        text: "This made the project click for me. The model architecture was not the only important part. The metric, class imbalance, and thresholding strategy were just as important for this legal multi-label task."
      }
    ]
  },
  "phrase-router": {
    kicker: "Experiment 07",
    title: "Rare legal phrase router",
    sections: [
      {
        heading: "What I tried",
        text: "After looking at per-label errors, I focused on labels 28, 29, and 31. They all involve art. 7:3 BW, but differ by extra legal context such as WVG, voorkeursrecht, Omgevingswet, or 9.9."
      },
      {
        heading: "What happened",
        text: "A small router improved the final validation result. It did not replace the neural model. It only adjusted probabilities for a narrow group of labels where the legal wording gave a clear signal."
      },
      {
        heading: "What I learned",
        text: "This was the most useful creative part of the project. It was small, interpretable, and based on the actual legal confusion I saw in the errors, not just on trying another generic model."
      }
    ]
  },
  "unresolved-labels": {
    kicker: "Error analysis",
    title: "Labels 23 and 26 stayed unresolved",
    sections: [
      {
        heading: "What I noticed",
        text: "These labels still had zero F1, which looked bad at first. They were tempting targets for manual phrase rules because the label names suggest possible keywords."
      },
      {
        heading: "Why I did not force a fix",
        text: "When I looked at the idea more carefully, the phrases were not clean enough. They could also appear in documents where the target label was not actually correct, so a simple boost would likely create false positives."
      },
      {
        heading: "What I learned",
        text: "Not every weak label should be fixed with a rule. In this case it was more honest to report the limitation than to add a noisy correction that only made the page look better."
      }
    ]
  },
  "clearer-pattern": {
    kicker: "Error analysis",
    title: "Labels 28, 29, and 31 had a clearer pattern",
    sections: [
      {
        heading: "What I noticed",
        text: "These labels were different from labels 23 and 26. They were not just rare or weak. They were legally close to each other and the model often confused the subtype."
      },
      {
        heading: "Why this mattered",
        text: "The extra words around art. 7:3 BW gave a real legal clue. WVG and voorkeursrecht pointed toward one label, while Omgevingswet and 9.9 pointed toward another."
      },
      {
        heading: "What I learned",
        text: "This was a better place for feature engineering because the rule was connected to legal meaning. It was not just a random keyword trick."
      }
    ]
  },
  "router-impact": {
    kicker: "Error analysis",
    title: "The router improved the labels it targeted",
    sections: [
      {
        heading: "What changed",
        text: "The router improved the specific labels it was designed for. Label 28 and label 31 improved a lot, and label 29 improved a little."
      },
      {
        heading: "Why I trust it more than the broad graph correction",
        text: "The correction was narrow and interpretable. It only touched a small group of related labels, and the change matched the legal phrases I expected to matter."
      },
      {
        heading: "Remaining limitation",
        text: "This still does not prove the model is perfect. A separate final test set would be stronger. But the improvement is easier to explain than a black-box tuning gain."
      }
    ]
  }
};

const dialog = document.getElementById("detail-dialog");
const detailTitle = document.getElementById("detail-title");
const detailKicker = document.getElementById("detail-kicker");
const detailBody = document.getElementById("detail-body");
let lastTrigger = null;

function renderDetail(key) {
  const content = detailContent[key];
  if (!content) return;

  detailKicker.textContent = content.kicker;
  detailTitle.textContent = content.title;
  detailBody.replaceChildren(
    ...content.sections.map((section) => {
      const wrapper = document.createElement("section");
      wrapper.className = "dialog-section";

      const heading = document.createElement("h3");
      heading.textContent = section.heading;

      const paragraph = document.createElement("p");
      paragraph.textContent = section.text;

      wrapper.append(heading, paragraph);
      return wrapper;
    })
  );
}

function openDetail(trigger) {
  lastTrigger = trigger;
  renderDetail(trigger.dataset.detail);
  showDialog();
}

function openDetailByKey(key) {
  lastTrigger = null;
  renderDetail(key);
  showDialog();
}

function showDialog() {
  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }
}

function closeDetail() {
  dialog.close();
  if (lastTrigger) {
    lastTrigger.focus();
  }
}

document.querySelectorAll("[data-detail]").forEach((button) => {
  button.addEventListener("click", () => openDetail(button));
});

document.querySelector("[data-close-dialog]").addEventListener("click", closeDetail);

dialog.addEventListener("click", (event) => {
  if (event.target === dialog) {
    closeDetail();
  }
});

dialog.addEventListener("close", () => {
  if (lastTrigger && document.activeElement === document.body) {
    lastTrigger.focus();
  }
});

const initialDetail = new URLSearchParams(window.location.search).get("detail");
if (initialDetail && detailContent[initialDetail]) {
  requestAnimationFrame(() => openDetailByKey(initialDetail));
}
