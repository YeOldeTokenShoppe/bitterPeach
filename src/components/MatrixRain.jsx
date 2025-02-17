import { useEffect, useRef } from "react";

function MatrixRain() {
  const matrixRef = useRef(null);

  useEffect(() => {
    function r(from, to) {
      return ~~(Math.random() * (to - from + 1) + from);
    }

    function pick() {
      return arguments[r(0, arguments.length - 1)];
    }

    function getChar() {
      return String.fromCharCode(
        pick(r(0x3041, 0x30ff), r(0x2000, 0x206f), r(0x0020, 0x003f))
      );
    }

    function loop(fn, delay) {
      let stamp = Date.now();
      function _loop() {
        if (Date.now() - stamp >= delay) {
          fn();
          stamp = Date.now();
        }
        requestAnimationFrame(_loop);
      }
      requestAnimationFrame(_loop);
    }

    class Char {
      constructor() {
        this.element = document.createElement("span");
        this.element.className = "matrix-char"; // Custom selector
        this.mutate();
      }

      mutate() {
        this.element.textContent = getChar();
      }
    }

    class Trail {
      constructor(list = [], options) {
        this.list = list;
        this.options = Object.assign({ size: 10, offset: 0 }, options);
        this.matrixBody = [];
        this.move();
      }

      traverse(fn) {
        this.matrixBody.forEach((n, i) => {
          let last = i === this.matrixBody.length - 1;
          if (n) fn(n, i, last);
        });
      }

      move() {
        this.matrixBody = [];
        let { offset, size } = this.options;
        for (let i = 0; i < size; ++i) {
          let item = this.list[offset + i - size + 1];
          this.matrixBody.push(item);
        }
        this.options.offset = (offset + 1) % (this.list.length + size - 1);
      }
    }

    class Rain {
      constructor({ target, row }) {
        this.element = document.createElement("p");
        this.element.className = "matrix-stream"; // Custom selector
        this.build(row);
        if (target) {
          target.appendChild(this.element);
        }
        this.drop();
      }

      build(row = 20) {
        let root = document.createDocumentFragment();
        let chars = [];
        for (let i = 0; i < row; ++i) {
          let c = new Char();
          root.appendChild(c.element);
          chars.push(c);
          if (Math.random() < 0.5) {
            loop(() => c.mutate(), r(1000, 5000));
          }
        }
        this.trail = new Trail(chars, { size: r(10, 30), offset: r(0, 100) });
        this.element.appendChild(root);
      }

      drop() {
        let trail = this.trail;
        let len = trail.matrixBody.length;
        let delay = r(10, 100);
        loop(() => {
          trail.move();
          trail.traverse((c, i, last) => {
            c.element.style = `color: #01ffed; opacity: ${(i + 1) / len}`;
            if (last) {
              c.mutate();
              c.element.style = `
    color: #01ffed;
    text-shadow:
      0 0 .5em #01ffed,
      0 0 .5em currentColor;
  `;
            }
          });
        }, delay);
      }
    }

    const main = matrixRef.current;
    if (main) {
      for (let i = 0; i < 50; ++i) {
        new Rain({ target: main, row: 50 });
      }
    }
  }, []);

  return <main ref={matrixRef} className="matrix-main"></main>;
}

export default MatrixRain;
