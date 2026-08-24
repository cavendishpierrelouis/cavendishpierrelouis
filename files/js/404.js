'use strict';


/* =========================================================
404
Automatic return home
========================================================= */


(function setup404Countdown() {


  const HOME_URL =
    'https://www.cavendishpierrelouis.io/';


  const START_AT =
    5;


  const number =
    document.querySelector(
      '[data-countdown]'
    );


  const progress =
    document.querySelector(
      '[data-countdown-progress]'
    );


  if (
    !number
  ) {
    return;
  }


  let remaining =
    START_AT;


  let intervalId =
    null;


  let redirectTimer =
    null;


  /* =======================================================
  FORMAT
  ======================================================= */


  function formatNumber(
    value
  ) {


    return String(
      value
    ).padStart(
      2,
      '0'
    );


  }


  /* =======================================================
  PROGRESS
  ======================================================= */


  function updateProgress() {


    if (
      !progress
    ) {
      return;
    }


    const ratio =
      Math.max(
        0,
        remaining /
        START_AT
      );


    progress.style.transform =
      `scaleX(${ratio})`;


  }


  /* =======================================================
  NUMBER MOTION
  ======================================================= */


  function animateNumber() {


    number.classList.remove(
      'is-changing'
    );


    void number.offsetWidth;


    number.classList.add(
      'is-changing'
    );


  }


  /* =======================================================
  RENDER
  ======================================================= */


  function render() {


    number.textContent =
      formatNumber(
        remaining
      );


    updateProgress();


    animateNumber();


  }


  /* =======================================================
  LEAVE
  ======================================================= */


  function leave() {


    if (
      document.body.classList.contains(
        'is-leaving'
      )
    ) {
      return;
    }


    document.body.classList.add(
      'is-leaving'
    );


    redirectTimer =
      window.setTimeout(
        function () {


          window.location.replace(
            HOME_URL
          );


        },
        480
      );


  }


  /* =======================================================
  TICK
  ======================================================= */


  function tick() {


    remaining -=
      1;


    if (
      remaining <=
      0
    ) {


      remaining =
        0;


      render();


      if (
        intervalId !==
        null
      ) {


        window.clearInterval(
          intervalId
        );


        intervalId =
          null;


      }


      leave();


      return;


    }


    render();


  }


  /* =======================================================
  START
  ======================================================= */


  render();


  intervalId =
    window.setInterval(
      tick,
      1000
    );


  /* =======================================================
  CLEANUP
  ======================================================= */


  window.addEventListener(
    'pagehide',


    function () {


      if (
        intervalId !==
        null
      ) {


        window.clearInterval(
          intervalId
        );


      }


      if (
        redirectTimer !==
        null
      ) {


        window.clearTimeout(
          redirectTimer
        );


      }


    },


    {
      once:
        true
    }
  );


}());
