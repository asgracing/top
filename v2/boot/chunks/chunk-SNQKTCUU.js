function renderSafetyAbout(copy,escape){const paragraph=text=>`<p>${escape(text)}</p>`;const summary=(copy.summary??[]).map(text=>`<li>${escape(text)}</li>`).join("");const sections=(copy.sections??[]).map(({title,paragraphs})=>`<h4>${escape(title)}</h4>${paragraphs.map(paragraph).join("")}`).join("");const guide=copy.profileGuide;const example=guide?`<div class="safety-rules-example">
    <h4>${escape(guide.exampleTitle)}</h4>${paragraph(guide.example)}
    <strong>${escape(guide.exampleCalculation)}</strong>
  </div>`:"";const details=copy.detailsLabel?`<details class="safety-rules-details">
    <summary>${escape(copy.detailsLabel)}</summary>${sections}
  </details>`:sections;return`<div class="safety-rules">
    <p class="safety-rules-lead"><strong>${escape(copy.safetyAboutP1)}</strong></p>
    ${summary?`<ul>${summary}</ul>`:""}
    ${example}
    ${guide?paragraph(guide.note):""}
    <p class="safety-rules-date">${escape(copy.safetyAboutP2)}</p>
    ${details}
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
