export default function Products() {
  return (
    <main style={{ width: '100vw', minHeight: '100vh', background: '#f5f7fa', padding: 0, margin: 0 }}>
      <section style={{ width: '100%', padding: '80px 0 40px 0', textAlign: 'center', background: '#fff' }}>
        <h1 style={{ fontSize: '2.8rem', fontWeight: 900, letterSpacing: 2, marginBottom: 16, color: '#1769aa' }}>Our Products</h1>
        <p style={{ color: '#5c5f66', fontSize: 20, maxWidth: 900, margin: '0 auto 32px' }}>
          Discover the Sparkpad suite—designed for executive productivity, collaboration, and AI-powered insights.
        </p>
      </section>
      <section style={{ width: '100%', background: '#f5f7fa', padding: '40px 0', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 48, flexWrap: 'wrap', maxWidth: 1400, margin: '0 auto' }}>
          <div style={{ flex: 1, minWidth: 260, background: '#fff', borderRadius: 24, boxShadow: '0 2px 12px #e3e8ee', padding: 32, margin: 12 }}>
            <h3 style={{ color: '#1769aa', fontWeight: 700, fontSize: 22, marginBottom: 8 }}>Project Management</h3>
            <p style={{ color: '#5c5f66', fontSize: 16 }}>Plan, track, and deliver projects with Kanban, Gantt, and AI-powered automation.</p>
          </div>
          <div style={{ flex: 1, minWidth: 260, background: '#fff', borderRadius: 24, boxShadow: '0 2px 12px #e3e8ee', padding: 32, margin: 12 }}>
            <h3 style={{ color: '#1769aa', fontWeight: 700, fontSize: 22, marginBottom: 8 }}>Team Collaboration</h3>
            <p style={{ color: '#5c5f66', fontSize: 16 }}>Chat, share files, and co-edit documents in real time—anywhere, anytime.</p>
          </div>
          <div style={{ flex: 1, minWidth: 260, background: '#fff', borderRadius: 24, boxShadow: '0 2px 12px #e3e8ee', padding: 32, margin: 12 }}>
            <h3 style={{ color: '#1769aa', fontWeight: 700, fontSize: 22, marginBottom: 8 }}>Executive Analytics</h3>
            <p style={{ color: '#5c5f66', fontSize: 16 }}>Visualize progress, forecast resources, and get actionable AI insights for your business.</p>
          </div>
        </div>
      </section>
      <section style={{ width: '100%', background: '#f5f7fa', padding: '40px 0', textAlign: 'center' }}>
        <h2 style={{ color: '#1769aa', fontWeight: 700, fontSize: 28, marginBottom: 16 }}>Why Sparkpad?</h2>
        <p style={{ color: '#5c5f66', fontSize: 18, maxWidth: 800, margin: '0 auto 32px' }}>
          Sparkpad brings together everything your team needs to succeed—beautifully designed, AI-powered, and ready for the future.
        </p>
      </section>
    </main>
  );
} 