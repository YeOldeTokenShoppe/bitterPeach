import React, { useEffect } from "react";

function Error({ statusCode }) {
  useEffect(() => {
    // Ensure dark background on error pages
    document.documentElement.style.backgroundColor = "#0d0d0d";
    document.body.style.backgroundColor = "#0d0d0d";
  }, []);

  return (
    <div
      style={{
        backgroundColor: "#0d0d0d",
        color: "white",
        height: "100vh",
        width: "100vw",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        padding: "20px",
      }}
    >
      <h1>
        {statusCode
          ? `An error ${statusCode} occurred on server`
          : "An error occurred on client"}
      </h1>
      <p>We apologize for the inconvenience.</p>
    </div>
  );
}

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
