 "use strict";

    /* ============================
      DATE + TIME (Los Angeles)
      ============================ */
    (function setupClock() {
      const dateEl = document.getElementById("date");
      const clockEl = document.getElementById("clock");
      if (!dateEl || !clockEl) return;

      const tz = "America/Los_Angeles";

      function tick() {
        const now = new Date();

        const dateFmt = new Intl.DateTimeFormat("en-US", {
          timeZone: tz,
          month: "2-digit",
          day: "2-digit",
          year: "numeric"
        });
        dateEl.textContent = dateFmt.format(now);

        const timeFmt = new Intl.DateTimeFormat("en-US", {
          timeZone: tz,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false
        });
        clockEl.textContent = timeFmt.format(now);
      }

      tick();
      setInterval(tick, 1000);
    })();

    /* ============================
      SCROLL REVEAL (.section)
      ============================ */
    (function setupScrollReveal() {
      const sections = document.querySelectorAll(".section");
      if (!sections.length) return;

      if (!("IntersectionObserver" in window)) {
        sections.forEach(s => s.classList.add("is-in"));
        return;
      }

      const observer = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-in");
            } else {
              entry.target.classList.remove("is-in");
            }
          });
        },
        { rootMargin: "0px 0px -10% 0px", threshold: 0.12 }
      );

      sections.forEach(s => observer.observe(s));
    })();

    /* ============================
      CATEGORY FILTER + SEARCH
      ============================ */
    (function setupBlogFilters() {
      const filterButtons = document.querySelectorAll(".filter-chip");
      const posts = document.querySelectorAll(".post-card");
      const searchInput = document.getElementById("blog-search");

      if (!posts.length) return;

      let activeCategory = "all";
      let searchTerm = "";

      function applyFilters() {
        const term = searchTerm.trim().toLowerCase();

        posts.forEach(post => {
          const cats = (post.dataset.categories || "").split(/\s+/);
          const tags = (post.dataset.tags || "").toLowerCase();
          const title = (post.querySelector(".post-title")?.textContent || "").toLowerCase();

          const matchesCategory = activeCategory === "all" || cats.includes(activeCategory);
          const matchesSearch = !term || title.includes(term) || tags.includes(term);

          const visible = matchesCategory && matchesSearch;
          post.style.display = visible ? "" : "none";
        });
      }

      function setActiveCategory(cat) {
        activeCategory = cat;

        filterButtons.forEach(btn => {
          const f = btn.dataset.filter || "all";
          btn.classList.toggle("is-active", f === cat);
        });
      }

      filterButtons.forEach(btn => {
        btn.addEventListener("click", () => {
          const cat = btn.dataset.filter || "all";
          setActiveCategory(cat);
          applyFilters();
        });
      });

      if (searchInput) {
        searchInput.addEventListener("input", () => {
          searchTerm = searchInput.value || "";
          applyFilters();
        });
      }

      // Initial filter
      applyFilters();
    })();