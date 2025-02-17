document.addEventListener("DOMContentLoaded", (event) => {
  let ridersStore = [
    { name: "Lambo", color: "brown", number: 1 },
    { name: "Yolonda", color: "red", number: 2 },
    { name: "Vitalik", color: "lime", number: 3 },
    { name: "Voltaire", color: "purple", number: 4 },
    { name: "Bucephalus", color: "orange", number: 5 },
    { name: "Angelica", color: "yellow", number: 6 },
    { name: "Dante", color: "gray", number: 7 },
    { name: "Satoshi", color: "beige", number: 0 },
    { name: "Pangloss", color: "goldenrod", number: 8 },
    { name: "Satanica", color: "lightblue", number: 9 },
    { name: "Quadrifoglio", color: "lightgreen", number: 10 },
    { name: "Pegasus", color: "steelblue", number: 11 },
    { name: "Evil Knievel", color: "coral", number: 12 },
  ];
  let numRiders = 13;
  let winnerOffset = 0;
  let finishOrder = [];
  let maxRaceTime = 7000;
  let maxRaceDiff = 2000;
  let raceLength = 500;

  const randInt = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  function setupRace() {
    let riders = ridersStore.slice(0, numRiders);
    let course = document.querySelector("#racecourse");
    let startBuilding = document.querySelectorAll(".startBuilding > path");
    let finishLinePaths = document.querySelectorAll(".finishLine > path");
    let finishLine = raceLength - 100;
    let buildingH = riders.length * 20 + 4;
    let totalHeight = numRiders * 20 + 20;
    document.querySelector(".ground").setAttribute("height", totalHeight);

    document
      .querySelector(".goldMedal")
      .setAttribute(
        "transform",
        `scale(0.2 0.2) translate(${1170 + raceLength} -200)`
      );
    document
      .querySelector(".silverMedal")
      .setAttribute(
        "transform",
        `scale(0.2 0.2) translate(${1170 + raceLength} -200)`
      );
    document
      .querySelector(".bronzeMedal")
      .setAttribute(
        "transform",
        `scale(0.2 0.2) translate(${1170 + raceLength} -200)`
      );

    startBuilding[0].setAttribute("d", `M -10 -2 h 50 v ${buildingH} h-50`);
    startBuilding[1].setAttribute(
      "d",
      `M -10 -2 l 25 ${buildingH / 8} v ${buildingH - buildingH / 3} l-25 ${
        buildingH / 5
      } M 40 -2 l-25 ${buildingH / 8}v ${buildingH - buildingH / 3} l25 ${
        buildingH / 5
      }`
    );
    let viewBoxWidth = 500; // The original width based on your design
    // Update the viewBox attribute to match the new height
    course.setAttribute("viewBox", `-10 -10 ${viewBoxWidth} ${totalHeight}`);
    finishLinePaths[0].setAttribute(
      "d",
      `M${finishLine} -10v${riders.length * 20 + 20}`
    );
    finishLinePaths[1].setAttribute(
      "d",
      `M${finishLine} -2.5v${riders.length * 20 + 5}`
    );
    finishLinePaths[2].setAttribute(
      "d",
      `M${finishLine} -2.5v${riders.length * 20 + 5}`
    );
    // reset stuff
    winnerOffset = 0;
    finishOrder = [];
    let g = document.querySelector("#playerArea");
    let gatesArea = document.querySelector("#gates");
    const winnersSVG = document.querySelector("#winnersSVG");
    // Remove existing racers
    while (g.firstChild) {
      g.removeChild(g.firstChild);
    }
    // Remove existing gates
    while (gatesArea.firstChild) {
      gatesArea.removeChild(gatesArea.firstChild);
    }
    let players = ``;
    let gates = ``;
    for (let i = 0; i < riders.length; i++) {
      // create gates
      gates += `<path d="M40 ${i * 20}v20" stroke="#fff" stroke-width="1">
          <animateTransform class="blocks" attributeName="transform" attributeType="XML" type="rotate" values="0 40 ${
            i * 20 + 20
          }; 90 40 ${
        i * 20 + 20
      }" dur="200ms" begin="indefinite" fill="freeze" />
        </path>`;
      let steps = randInt(7, 14);
      let keyTimes = `0`;
      let splines = ``;
      let vals = `10`;

      for (let j = 1; j < steps; j++) {
        keyTimes += `;${j / steps}`;
        let lowerLimit = j / steps - (1 / steps) * 0.5;
        let upperLimit = j / steps + (1 / steps) * 0.5;
        vals += `;${randInt(
          Math.floor((finishLine - 30) * lowerLimit),
          Math.floor((finishLine - 30) * upperLimit)
        )}`;
        splines += `${randInt(10, 100) / 100} ${randInt(10, 100) / 100} ${
          randInt(10, 100) / 100
        } ${randInt(10, 100) / 100};`;
      }

      keyTimes += ";1";
      splines += `0 0 0 0`;
      vals += `;${finishLine - 30}`;
      let dur = randInt(maxRaceTime - maxRaceDiff, maxRaceTime);
      players += `<g class="racer">
          <g stroke="#111" stroke-width="0.25" class="rider" data-player="${
            riders[i].name
          }" data-color="${riders[i].color}" data-lane="${i}">
          <g>
            <text class="racerName" stroke="none" fill="#fff" font-family="monospace" font-size="6" y="${
              7.5 + i * 20
            }" x="${-30 - riders[i].name.length * 2}">${riders[i].name}</text>
            <animateTransform attributeName="transform" attributeType="XML" type="translate" values="0 0; -113 0" dur="${
              (180 / raceLength) * dur
            }ms" begin="raceMotion${i}.end" fill="freeze" />
          </g>
          <text class="racerFinish" fill="#ccc" stroke="#fff" font-family="monospace" font-size="7" y="${
            7.5 + i * 20
          }" x="-85" text-anchor="middle"></text>
          <ellipse class="shadow" filter="url(#blur)" cx="8" cy="${
            22 + i * 20
          }" rx="17" ry="3" fill="rgba(0,0,0,0.5)" />
          <g class="thingsThatGallop">
            <use href="#horse" transform="translate(0 ${
              7.5 + i * 20
            })"  filter="brightness(${randInt(30, 70)}%)"/>
            <path class="number" d="M 10 ${7.1 + i * 20} h ${
        4 + riders[i].number.toString().length
      } v 5 h -${4 + riders[i].number.toString().length}" fill="#fff" />
            <text font-size="4" x="11.5" y="${11 + i * 20}">${
        riders[i].number || i
      }</text>
            <animateTransform class="playerGallop" attributeName="transform" attributeType="XML" type="rotate" values="-12 10 ${
              7.5 + i * 20
            }; 12 10 ${7.5 + i * 20}; -12 10 ${
        7.5 + i * 20
      }" dur="500ms" begin="${randInt(-3000, 0)}ms" repeatCount="indefinite" />
          </g>
          <use href="#jockey" fill="${
            riders[i].color
          }" transform="translate(0 ${7.1 + i * 20})" />
          <animateTransform attributeName="transform" attributeType="XML" type="translate" values="0 0; 130 0" dur="${
            (180 / raceLength) * dur
          }ms" begin="raceMotion${i}.end" fill="freeze" keyTimes="0;1" keySplines="0.67 0.64 0.37 0.28" calcMode="spline" />
        </g>
      <animateTransform id="raceMotion${i}" class="players" attributeName="transform" attributeType="XML" type="translate" values="${vals}" dur="${dur}ms" begin="indefinite" keyTimes="${keyTimes}" keySplines="${splines}" calcMode="spline" fill="freeze" />
      </g>`;
    }
    const wrapper = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
    wrapper.innerHTML = `<g>${players}</g>`;
    const doc = wrapper.firstChild;
    g.appendChild(doc);
    const wrapper2 = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
    wrapper2.innerHTML = `<g>${gates}</g>`;
    const doc2 = wrapper2.firstChild;
    gatesArea.appendChild(doc2);
  }

  function startRace() {
    console.log("Race started"); // Log the race start

    // open the gates
    document.querySelectorAll(".blocks").forEach((gate) => {
      gate.beginElement();
    });

    // start the race
    document.querySelectorAll(".players").forEach((player) => {
      player.beginElement();
      if (!player._hasListener) {
        player._hasListener = true;
        // Add the animationend event listener
        player.addEventListener("endEvent", (event) => {
          let rider = player.parentElement.querySelector(".rider");
          finishOrder.push([
            rider.getAttribute("data-player"),
            rider.getAttribute("data-color"),
            rider.getAttribute("data-lane"),
          ]);
          if (finishOrder.length === 1) {
            document
              .querySelector(".medals")
              .setAttribute("transform", `translate(${raceLength - 95} 0)`);
            document
              .querySelector(".goldMedal")
              .setAttribute(
                "transform",
                `scale(0.2 0.2) translate(0 ${100 * finishOrder[0][2] - 24})`
              );
          }
          if (finishOrder.length === 2) {
            document
              .querySelector(".silverMedal")
              .setAttribute(
                "transform",
                `scale(0.2 0.2) translate(0 ${100 * finishOrder[1][2] - 24})`
              );
          }
          if (finishOrder.length === 3) {
            document
              .querySelector(".bronzeMedal")
              .setAttribute(
                "transform",
                `scale(0.2 0.2) translate(0 ${100 * finishOrder[2][2] - 24})`
              );
          }

          if (finishOrder.length === ridersStore.length) {
            for (let o = 3; o < finishOrder.length; o++) {
              document.querySelector(
                `[data-player="${finishOrder[o][0]}"] > .racerFinish`
              ).textContent = o + 1;
            }
            let winner = finishOrder[0][0];
            console.log("Race finished, winner:", winner); // Log the race winner

            const message = {
              type: "raceWinner",
              winner: winner,
            };

            console.log("Sending message:", message);
            console.log("Posting message:", message);
            window.parent.postMessage(message, "*"); // Allow any origin for testing
          }
        });
      }
    });
  }

  // Initially setup the race
  setupRace();

  // Attach event listener to the restart button
  document.querySelector(".restart").addEventListener("click", () => {
    setupRace();
    startRace();
  });

  // Start the race automatically for testing purposes
  // startRace();
});
