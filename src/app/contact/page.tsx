import React from "react";

export default function ContactPage() {
    return (
        <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <div className="futuristic-hero-bg" />
            <section className="glass futuristic-section" style={{ maxWidth: 480, width: '100%', zIndex: 1, boxShadow: '0 8px 32px #232b4d44' }}>
                <h1 className="holo-text" style={{ fontSize: '2.2rem', fontWeight: 900, textAlign: 'center', marginBottom: 24 }}>Contact Us</h1>
                <form style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <div>
                        <label htmlFor="name" className="neon-text" style={{ fontWeight: 600 }}>Name</label>
                        <input id="name" name="name" type="text" defaultValue="Alex Future" className="glass" style={{ width: '100%', padding: '12px 18px', fontSize: 18, borderRadius: 12, border: 'none', marginTop: 6, color: '#ededed', background: 'rgba(35,43,77,0.18)' }} />
                    </div>
                    <div>
                        <label htmlFor="email" className="neon-text" style={{ fontWeight: 600 }}>Email</label>
                        <input id="email" name="email" type="email" defaultValue="alex.future@innovate.com" className="glass" style={{ width: '100%', padding: '12px 18px', fontSize: 18, borderRadius: 12, border: 'none', marginTop: 6, color: '#ededed', background: 'rgba(35,43,77,0.18)' }} />
                    </div>
                    <div>
                        <label htmlFor="subject" className="neon-text" style={{ fontWeight: 600 }}>Subject</label>
                        <input id="subject" name="subject" type="text" defaultValue="Inquiry about SparkPad" className="glass" style={{ width: '100%', padding: '12px 18px', fontSize: 18, borderRadius: 12, border: 'none', marginTop: 6, color: '#ededed', background: 'rgba(35,43,77,0.18)' }} />
                    </div>
                    <div>
                        <label htmlFor="message" className="neon-text" style={{ fontWeight: 600 }}>Message</label>
                        <textarea id="message" name="message" rows={5} defaultValue="I am highly interested in learning more about SparkPad and its potential applications for my organization." className="glass" style={{ width: '100%', padding: '12px 18px', fontSize: 18, borderRadius: 12, border: 'none', marginTop: 6, color: '#ededed', background: 'rgba(35,43,77,0.18)', resize: 'vertical' }} />
                    </div>
                    <button type="submit" className="futuristic-btn" style={{ fontSize: '1.1rem', marginTop: 12 }}>Submit</button>
                </form>
            </section>
        </main>
    );
} 