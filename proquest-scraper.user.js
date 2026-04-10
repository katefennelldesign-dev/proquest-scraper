// ==UserScript==
// @name         ProQuest Ebook Scraper CDU
// @namespace    https://github.com/katefennelldesign-dev/proquest-scraper
// @updateURL    https://raw.githubusercontent.com/katefennelldesign-dev/proquest-scraper/main/proquest-scraper.user.js
// @downloadURL  https://raw.githubusercontent.com/katefennelldesign-dev/proquest-scraper/main/proquest-scraper.user.js
// @version      1.2
// @description  Automatically downloads entire ebooks from ProQuest Ebook Central as a PDF, triggered by user action.
// @match        https://ebookcentral.proquest.com/lib/*/reader.action?docID=*
// @grant        GM_registerMenuCommand
// @grant        GM_notification
// @require      https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js
// ==/UserScript==

(function() {
  'use strict';
  const softwareTitle = "LIRN ProQuest Ebook Scraper";

  async function scrollThroughPages() {
    function getCurrentPageNumber() {
      return document.getElementById("tool-current-page-loc").innerText;
    }

    function goForward() {
      document.getElementById("tool-pager-next").click();
    }

    function goBackward() {
      document.getElementById("tool-pager-prev").click();
    }

    let lastPageNumber = null;
    while (true) {
      const currentPage = getCurrentPageNumber();
      if (currentPage === lastPageNumber) {
        break;
      }
      lastPageNumber = currentPage;
      goForward();
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    const pageContainers = document.querySelectorAll('[id^="mainPageContainer_"]');
    const { jsPDF } = window.jspdf;

    let pdf = null;

    for (const container of pageContainers) {
      const img = container.querySelector('.mainViewerImg');
      if (!img || !img.src) continue;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const image = new Image();
      image.crossOrigin = 'anonymous';

      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
        image.src = img.src;
      });

      canvas.width = image.width;
      canvas.height = image.height;
      ctx.drawImage(image, 0, 0);

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdfWidth = image.width * 0.75;
      const pdfHeight = image.height * 0.75;

      if (!pdf) {
        pdf = new jsPDF({
          orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
          unit: 'pt',
          format: [pdfWidth, pdfHeight]
        });
      } else {
        pdf.addPage([pdfWidth, pdfHeight], pdfWidth > pdfHeight ? 'landscape' : 'portrait');
      }

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    }

    if (pdf) {
      pdf.save(document.title + '.pdf');
      GM_notification({
        text: 'PDF download complete!',
        title: softwareTitle,
        timeout: 5000
      });
    }
  }

  GM_registerMenuCommand("Start Ebook Scraping", scrollThroughPages);
})();
