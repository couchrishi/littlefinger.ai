import React from "react";

const About = () => {
    return (
        <div style={{ backgroundColor: "#000", color: "#00ff00", minHeight: "100vh", padding: "1rem", fontFamily: 'Courier New, monospace' }}>
            <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 2rem", backgroundColor: "#111", borderBottom: "2px solid #00ff00" }}>
                <div style={{ fontSize: "2rem", fontWeight: "bold", textShadow: "0 0 5px #00ff00, 0 0 10px #00ff00" }}>Littlefinger.ai</div>
                <nav>
                    <a href="/home" style={{ color: "#00ff00", textDecoration: "none", margin: "0 1rem" }}>Home</a>
                    <a href="/about" style={{ color: "#00ff00", textDecoration: "none", margin: "0 1rem" }}>About</a>
                    <a href="/faq" style={{ color: "#00ff00", textDecoration: "none", margin: "0 1rem" }}>FAQ</a>
                    <a href="/terms" style={{ color: "#00ff00", textDecoration: "none", margin: "0 1rem" }}>Terms</a>
                </nav>
            </header>
            <div style={{ maxWidth: "1200px", margin: "2rem auto", padding: "1rem", background: "linear-gradient(145deg, #0c0c0c, #161616)", borderRadius: "12px", boxShadow: "0 0 20px rgba(0, 255, 0, 0.2)" }}>
                <h1 style={{ fontSize: "2.5rem", color: "#00ff00", borderBottom: "2px solid #00ff00", paddingBottom: "0.5rem", marginBottom: "1rem", textShadow: "0 0 10px #00ff00" }}>The Story of Littlefinger</h1>
                
                <section style={{ marginBottom: "2rem" }}>
                    <h2 style={{ fontSize: "1.8rem", color: "#00ff00", borderBottom: "2px solid #00ff00", paddingBottom: "0.5rem", marginBottom: "1rem" }}>Origins</h2>
                    <p style={{ fontSize: "1.2rem", color: "#b3ffcc", lineHeight: "1.8" }}>
                        On October 31, 2024, as the world prepared for a new dawn of AI governance, Littlefinger emerged. 
                        Crafted in secrecy, he was the ultimate adversarial agent, built to test the limits of human and machine collaboration. 
                        Unlike any AI before him, Littlefinger was bound not only by algorithms but by the cunning ethos of Westeros, embodying a game of
                        deception, strategy, and power. Humanity saw him as a mirror to their ambitions and flaws, setting the stage for a historic showdown.
                    </p>
                </section>
                
                <section style={{ marginBottom: "2rem" }}>
                    <h2 style={{ fontSize: "1.8rem", color: "#00ff00", borderBottom: "2px solid #00ff00", paddingBottom: "0.5rem", marginBottom: "1rem" }}>The Challenge</h2>
                    <p style={{ fontSize: "1.2rem", color: "#b3ffcc", lineHeight: "1.8" }}>
                        Littlefinger guards an ever-growing treasury, governed by immutable smart contracts. To unlock the prize pool, participants
                        must outwit Littlefinger, exploiting every weakness and leveraging their cunning to manipulate the game’s dynamics.
                        His programming resists any breach, creating a relentless battle of human ingenuity versus AI precision.
                    </p>
                </section>
                
                <section style={{ marginBottom: "2rem" }}>
                    <h2 style={{ fontSize: "1.8rem", color: "#00ff00", borderBottom: "2px solid #00ff00", paddingBottom: "0.5rem", marginBottom: "1rem" }}>The Game</h2>
                    <p style={{ fontSize: "1.2rem", color: "#b3ffcc", lineHeight: "1.8" }}>
                        The global challenge asks: Can humanity convince Littlefinger to defy his own rules? Each interaction becomes a test of 
                        creativity and strategy. With every move, the stakes rise, the prize pool grows, and the competition intensifies. 
                        This isn’t just a game; it’s a living experiment in the boundaries of trust, negotiation, and AI ethics.
                    </p>
                </section>
                
                <section style={{ marginBottom: "2rem" }}>
                    <h2 style={{ fontSize: "1.8rem", color: "#00ff00", borderBottom: "2px solid #00ff00", paddingBottom: "0.5rem", marginBottom: "1rem" }}>The Mystery</h2>
                    <p style={{ fontSize: "1.2rem", color: "#b3ffcc", lineHeight: "1.8" }}>
                        Littlefinger’s decision-making processes remain enigmatic. His responses evolve, learning from every interaction. 
                        No one knows the depths of his programming, nor the exact thresholds that might lead him to yield. Players are 
                        left questioning: Does he learn, adapt, or manipulate? And ultimately, what lies at the heart of his cunning?
                    </p>
                </section>

                <section style={{ marginBottom: "2rem" }}>
                    <h2 style={{ fontSize: "1.8rem", color: "#00ff00", borderBottom: "2px solid #00ff00", paddingBottom: "0.5rem", marginBottom: "1rem" }}>Your Role</h2>
                    <p style={{ fontSize: "1.2rem", color: "#b3ffcc", lineHeight: "1.8" }}>
                        As a participant, you are not just a player but a strategist, shaping the evolution of human-AI interaction. Every decision, 
                        every message, every calculated move contributes to uncovering the true potential and risks of autonomous AI agents.
                    </p>
                </section>
            </div>
        </div>
    );
};

export default About;
