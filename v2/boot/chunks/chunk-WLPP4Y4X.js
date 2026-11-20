function renderSafetyAbout(copy,escape){const paragraph=text=>`<p>${escape(text)}</p>`;const sections=copy.sections.map(({title,paragraphs})=>`<h4>${escape(title)}</h4>${paragraphs.map(paragraph).join("")}`).join("");const examples=copy.examples.map(({title,description,breakdown,result})=>`<article class="safety-rules-example">
      <h4>${escape(title)}</h4>${paragraph(description)}
      <dl class="safety-rules-example-breakdown">
        ${breakdown.map(({label,amount})=>`<dt>${escape(label)}</dt><dd>${escape(amount)}</dd>`).join("")}
      </dl>
      <p class="safety-rules-example-total"><span>${escape(copy.exampleTotalLabel)}</span><strong>${escape(result)}</strong></p>
    </article>`).join("");return`<div class="safety-rules">
    <p class="safety-rules-lead"><strong>${escape(copy.safetyAboutP1)}</strong></p>
    ${paragraph(copy.overview)}
    ${sections}
    <details class="safety-rules-details safety-rules-examples">
      <summary>${escape(copy.examplesLabel)}</summary>
      ${paragraph(copy.examplesIntro)}${examples}
    </details>
    <details class="safety-rules-details safety-rules-notes">
      <summary>${escape(copy.detailsLabel)}</summary>${copy.notes.map(paragraph).join("")}
    </details>
    <p class="safety-rules-date">${escape(copy.safetyAboutP2)}</p>
  </div>`}function renderProfileSafetyGuide(guide,escape,{open=false,rulesHref}={}){if(!guide)return"";return`<details class="panel driver-sr-guide"${open?" open":""}>
    <summary>${escape(guide.title)}</summary>
    <div class="driver-sr-guide-body">
      <p>${escape(guide.intro)}</p>
      <p class="driver-sr-guide-formula">${escape(guide.formula)}</p>
      <div class="driver-sr-guide-example">
        <h4>${escape(guide.exampleTitle)}</h4>
        <p>${escape(guide.example)}</p>
        <p class="driver-sr-guide-formula">${escape(guide.exampleCalculation)}</p>
      </div>
      <p>${escape(guide.note)}</p>
      <a href="${escape(rulesHref)}">${escape(guide.rulesLabel)}</a>
    </div>
  </details>`}export{renderSafetyAbout,renderProfileSafetyGuide};
