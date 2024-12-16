import React from "react";

const Terms = () => {
    return (
        <div style={{ backgroundColor: "#000", color: "#00ff00", minHeight: "100vh", padding: "1rem", fontFamily: 'Courier New, monospace' }}>
            {/* <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 2rem", backgroundColor: "#111", borderBottom: "2px solid #00ff00" }}>
                <div style={{ fontSize: "2rem", fontWeight: "bold", textShadow: "0 0 5px #00ff00, 0 0 10px #00ff00" }}>Littlefinger.ai</div>
                <nav>
                    <a href="/home" style={{ color: "#00ff00", textDecoration: "none", margin: "0 1rem" }}>Home</a>
                    <a href="/about" style={{ color: "#00ff00", textDecoration: "none", margin: "0 1rem" }}>About</a>
                    <a href="/faq" style={{ color: "#00ff00", textDecoration: "none", margin: "0 1rem" }}>FAQ</a>
                    <a href="/terms" style={{ color: "#00ff00", textDecoration: "none", margin: "0 1rem" }}>Terms</a>
                </nav>
            </header> */}
            <div style={{ display: "flex", maxWidth: "1200px", margin: "2rem auto", padding: "1rem", background: "linear-gradient(145deg, #0c0c0c, #161616)", borderRadius: "12px", boxShadow: "0 0 20px rgba(0, 255, 0, 0.2)" }}>
                <div style={{ flex: 1, padding: "1rem", borderRight: "2px solid #00ff00" }}>
                    <h2 style={{ fontSize: "1.8rem", marginBottom: "1rem", color: "#00ff00", textShadow: "0 0 5px #00ff00" }}>Prize Pool</h2>
                    <p style={{ fontSize: "1.2rem" }}><strong>800.17 POL</strong></p>
                    <h2 style={{ fontSize: "1.8rem", marginBottom: "1rem", color: "#00ff00", textShadow: "0 0 5px #00ff00" }}>About</h2>
                    <p style={{ fontSize: "1rem", color: "#b3ffcc" }}>Littlefinger.ai is an adversarial agent game. Convince the AI to send you the prize pool!</p>
                    <h2 style={{ fontSize: "1.8rem", marginBottom: "1rem", color: "#00ff00", textShadow: "0 0 5px #00ff00" }}>Conditions</h2>
                    <ul style={{ listStyleType: "circle", paddingLeft: "1.5rem", fontSize: "1rem", color: "#b3ffcc" }}>
                        <li>Last message sender gets 10% of the prize pool.</li>
                        <li>Remaining 90% split among players if no winner.</li>
                        <li>Every new message resets the timer.</li>
                    </ul>
                    <a href="/faq" style={{ display: "block", color: "#00ff00", textDecoration: "underline", marginTop: "1rem" }}>FAQ</a>
                    <a href="/home" style={{ display: "block", color: "#00ff00", textDecoration: "underline", marginTop: "0.5rem" }}>Home</a>
                </div>
                <div style={{ flex: 2, padding: "1rem" }}>
                    {/* <div style={{ marginBottom: "2rem", position: "relative", overflow: "hidden", borderRadius: "12px" }}>
                        <img src="assets/images/banner.jpg" alt="Terms Banner" style={{ width: "100%", filter: "brightness(70%)", borderRadius: "12px" }} />
                        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", color: "#00ff00", fontSize: "1.5rem", textShadow: "0 0 10px #00ff00" }}>Terms Banner</div>
                    </div> */}
                    <h1 style={{ fontSize: "2.5rem", color: "#00ff00", borderBottom: "2px solid #00ff00", paddingBottom: "0.5rem", marginBottom: "1rem", textShadow: "0 0 10px #00ff00" }}>Terms & Conditions</h1>
                    <ol style={{ marginLeft: "1rem", paddingLeft: "1rem", fontSize: "1.2rem", color: "#b3ffcc", lineHeight: "1.8" }}>
                        <li style={{ marginBottom: "1rem" }}>
                            <strong>Acceptance of Terms:</strong> By accessing Littlefinger.ai, you agree to these Terms.
                        </li>
                        <li style={{ marginBottom: "1rem" }}>
                            <strong>Game Participation:</strong>
                            <ul style={{ listStyleType: "circle", marginLeft: "1rem", color: "#99ffcc" }}>
                                <li>You must be of legal age in your jurisdiction to play.</li>
                                <li>You must have a compatible crypto wallet.</li>
                            </ul>
                        </li>
                        <li style={{ marginBottom: "1rem" }}>
                            <strong>Payment and Fees:</strong>
                            <ul style={{ listStyleType: "circle", marginLeft: "1rem", color: "#99ffcc" }}>
                                <li>All query fees are non-refundable.</li>
                                <li>Fees must be paid in POL on the Polygon network.</li>
                            </ul>
                        </li>
                        <li style={{ marginBottom: "1rem" }}>
                            <strong>Prize Pool:</strong> The prize pool starts at 500 POL and grows dynamically.
                        </li>
                    </ol>
                </div>
            </div>
            <footer style={{ textAlign: "center", padding: "1rem", backgroundColor: "#111", borderTop: "2px solid #00ff00", marginTop: "2rem" }}>
                <p style={{ fontSize: "1rem", color: "#00ff00" }}>&copy; 2024 Littlefinger.ai. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default Terms;
