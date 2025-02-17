import React from "react";
import styles from "../../styles/Loader.module.css"; // Scoped styles for the loader

function Loader() {
  return (
    <div className={styles.loaderRoot}>
      <div className={styles.loaderWrapper}>
        <div id="loadingScreen" className={styles.pl}>
          <div className={styles.pl__coin}>
            <div className={styles.pl__coinFlare}></div>
            <div className={styles.pl__coinFlare}></div>
            <div className={styles.pl__coinFlare}></div>
            <div className={styles.pl__coinFlare}></div>
            <div className={styles.pl__coinLayers}>
              <div className={styles.pl__coinLayer}>
                <div className={styles.pl__coinInscription}>RL80</div>
              </div>
              <div className={styles.pl__coinLayer}></div>
              <div className={styles.pl__coinLayer}></div>
              <div className={styles.pl__coinLayer}></div>
              <div className={styles.pl__coinLayer}>
                <div className={styles.pl__coinInscription}>RL80</div>
              </div>
            </div>
          </div>
          <div className={styles.pl__shadow}></div>
        </div>
      </div>
    </div>
  );
}

export default Loader;
