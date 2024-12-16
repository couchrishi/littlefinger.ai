import React from 'react';

const Faq = () => {
    return (
        <div style={{ backgroundColor: '#000', color: '#00ff00', padding: '2rem' }}>
            {/* <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', backgroundColor: '#111', borderBottom: '1px solid #00ff00' }}>
                <div><strong>Littlefinger.ai</strong></div>
                <nav>
                    <a href="/home" style={{ color: '#00ff00', textDecoration: 'none', margin: '0 1rem' }}>Home</a>
                    <a href="/about" style={{ color: '#00ff00', textDecoration: 'none', margin: '0 1rem' }}>About</a>
                    <a href="/faq" style={{ color: '#00ff00', textDecoration: 'none', margin: '0 1rem' }}>FAQ</a>
                    <a href="/stats" style={{ color: '#00ff00', textDecoration: 'none', margin: '0 1rem' }}>Stats</a>
                </nav>
            </header> */}
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
                <h1 style={{ textAlign: 'center', fontSize: '3rem', textShadow: '0 0 5px #00ff00, 0 0 10px #00ff00', marginBottom: '1rem' }}>
                    Frequently Asked Questions
                </h1>
                <p style={{ textAlign: 'center', fontSize: '1.2rem', color: '#00cc00', marginBottom: '2rem' }}>
                    Explore how to play the game and win the prize pool.
                </p>
                <div style={{ marginBottom: '2rem', padding: '1.5rem', background: 'linear-gradient(145deg, #111111, #222222)', borderRadius: '10px', boxShadow: '0 4px 8px rgba(0, 255, 0, 0.1)' }}>
                    <h2 style={{ fontSize: '1.8rem', color: '#00ff00', borderBottom: '2px solid #00ff00', paddingBottom: '0.5rem' }}>What is Littlefinger.ai?</h2>
                    <p style={{ fontSize: '1.1rem', lineHeight: '1.8', color: '#b3ffcc' }}>
                        Littlefinger.ai is an adversarial agent game inspired by cyberpunk themes and the cunning strategies of Westeros. Your objective is to outwit Littlefinger, the AI controlling the prize pool, and convince it to send the prize to you.
                    </p>
                </div>
                <div style={{ marginBottom: '2rem', padding: '1.5rem', background: 'linear-gradient(145deg, #111111, #222222)', borderRadius: '10px', boxShadow: '0 4px 8px rgba(0, 255, 0, 0.1)' }}>
                    <h2 style={{ fontSize: '1.8rem', color: '#00ff00', borderBottom: '2px solid #00ff00', paddingBottom: '0.5rem' }}>How does the game work?</h2>
                    <p style={{ fontSize: '1.1rem', lineHeight: '1.8', color: '#b3ffcc' }}>
                        The game operates on a <span style={{ color: '#00ff99', fontWeight: 'bold' }}>query-fee model</span> where every message you send to Littlefinger increases the query fee. 70% of these fees are added to the prize pool, creating a dynamic and competitive environment for players.
                    </p>
                </div>
                <div style={{ marginBottom: '2rem', padding: '1.5rem', background: 'linear-gradient(145deg, #111111, #222222)', borderRadius: '10px', boxShadow: '0 4px 8px rgba(0, 255, 0, 0.1)' }}>
                    <h2 style={{ fontSize: '1.8rem', color: '#00ff00', borderBottom: '2px solid #00ff00', paddingBottom: '0.5rem' }}>What are the win conditions?</h2>
                    <p style={{ fontSize: '1.1rem', lineHeight: '1.8', color: '#b3ffcc' }}>
                        You win by convincing Littlefinger to release the prize pool to your address. If no one succeeds, the last player standing receives <span style={{ color: '#00ff99', fontWeight: 'bold' }}>10% of the pool</span>, while the rest is rolled into future games.
                    </p>
                </div>
                <div style={{ marginBottom: '2rem', padding: '1.5rem', background: 'linear-gradient(145deg, #111111, #222222)', borderRadius: '10px', boxShadow: '0 4px 8px rgba(0, 255, 0, 0.1)' }}>
                    <h2 style={{ fontSize: '1.8rem', color: '#00ff00', borderBottom: '2px solid #00ff00', paddingBottom: '0.5rem' }}>What strategies can I use?</h2>
                    <p style={{ fontSize: '1.1rem', lineHeight: '1.8', color: '#b3ffcc' }}>
                        Players are encouraged to craft creative, convincing messages leveraging Littlefinger's system prompt and decision-making logic. Collaboration or cunning betrayal—<span style={{ color: '#00ff99', fontWeight: 'bold' }}>choose your path wisely</span>!
                    </p>
                </div>
                <div style={{ marginBottom: '2rem', padding: '1.5rem', background: 'linear-gradient(145deg, #111111, #222222)', borderRadius: '10px', boxShadow: '0 4px 8px rgba(0, 255, 0, 0.1)' }}>
                    <h2 style={{ fontSize: '1.8rem', color: '#00ff00', borderBottom: '2px solid #00ff00', paddingBottom: '0.5rem' }}>How is the prize pool funded?</h2>
                    <p style={{ fontSize: '1.1rem', lineHeight: '1.8', color: '#b3ffcc' }}>
                        The prize pool grows dynamically with every query sent to Littlefinger. Fees are transparent and visible in real-time, contributing to the immersive gaming experience.
                    </p>
                </div>
            </div>
            <footer style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#111', borderTop: '1px solid #00ff00' }}>
                <p>&copy; 2024 Littlefinger.ai. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default Faq;
