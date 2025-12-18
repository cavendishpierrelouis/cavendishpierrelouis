 "use strict";

    /* DATE + TIME (Los Angeles) */
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

    /* SCROLL REVEAL (.section) */
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
        { rootMargin: "0px 0px -10% 0px", threshold: 0.01 }
      );

      sections.forEach(s => observer.observe(s));
    })();