// ==UserScript==
// @name         ProQuest Ebook Scraper CDU
// @namespace    https://github.com/katefennelldesign-dev/proquest-scraper
// @version      1.2
// @description  Automatically downloads entire ebooks from ProQuest Ebook Central as a PDF, triggered by user action.
// @match        https://ebookcentral.proquest.com/lib/*/reader.action?docID=*
// @grant        GM_registerMenuCommand
// @grant        GM_notification
// @require      https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js
// ==/UserScript==

(function() {
  'use strict';
  const softwareTitle = "ProQuest Ebook Scraper CDU";

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
      if (currentPage == lastPageNumber) {
        goForward(); goBackward();
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (getCurrentPageNumber() == lastPageNumber) {
          if (confirm("Is " + currentPage + " the first page's number?")) break;
        }
      }
      lastPageNumber = currentPage;
      goBackward();
    }

    lastPageNumber = null;
    while (true) {
      const currentPage = getCurrentPageNumber();
      if (currentPage == lastPageNumber) {
        goForward();
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (getCurrentPageNumber() == lastPageNumber) break;
      }
      lastPageNumber = currentPage;
      goForward();
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  function getImageTags() {
    return document.querySelectorAll("div > img[src*='docImage.action']")
  }

  async function waitForImagesToLoad(timeout = 30000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const images = getImageTags();
      let allLoaded = true;
      for (const img of images) {
        if (!img.complete || img.naturalWidth === 0) {
          allLoaded = false;
          break;
        }
      }
      if (allLoaded) return images;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    return getImageTags();
  }

  async function convertImagesToPDF(imageTags) {
    const pdf = new jspdf.jsPDF();

    for (let i = 0; i < imageTags.length; i++) {
      const img = imageTags[i];

      await new Promise((resolve) => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const imgData = canvas.toDataURL("image/jpeg");

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        let imgWidth = pdfWidth;
        let imgHeight = (canvas.height / canvas.width) * pdfWidth;

        if (imgHeight > pdfHeight) {
          imgHeight = pdfHeight;
          imgWidth = (canvas.width / canvas.height) * pdfHeight;
        }

        if (i > 0) pdf.addPage();
        const xOffset = (pdfWidth - imgWidth) / 2;
        const yOffset = (pdfHeight - imgHeight) / 2;

        pdf.addImage(imgData, "JPEG", xOffset, yOffset, imgWidth, imgHeight);
        resolve();
      });
    }

    const title = document.querySelector(".book-title")?.innerText || "downloaded_book";
    pdf.save(`${title}.pdf`);
  }

  GM_registerMenuCommand("Start Ebook Scraping", async function() {
    GM_notification("Starting ebook download process...", softwareTitle);
    await scrollThroughPages();

    GM_notification("Waiting for images to load (timeout: 30 seconds)...", softwareTitle);
    const imageTags = await waitForImagesToLoad();
    GM_notification(`Found ${imageTags.length} images to save.`, softwareTitle);
    await convertImagesToPDF(imageTags);
    GM_notification("Download complete!", softwareTitle);
  });
})();
