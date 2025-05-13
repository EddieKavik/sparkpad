import { IconRocket, IconRobot, IconTag, IconUsersGroup, IconSparkles } from "@tabler/icons-react";

const services = [
  {
    name: "SparkPad",
    icon: <IconRocket size={56} className="futuristic-icon" />,
    description: "SparkPad is your next-gen digital workspace. Effortlessly organize projects, notes, and ideas in a visually stunning, AI-powered environment. Real-time sync, Markdown support, and seamless collaboration put the future of productivity at your fingertips.",
  },
  {
    name: "SparkChat",
    icon: <IconRobot size={56} className="futuristic-icon" />,
    description: "SparkChat is your intelligent team messenger. Instantly connect, brainstorm, and share files with built-in AI assistance. Enjoy secure, real-time conversations and smart suggestions that keep your team moving at the speed of innovation.",
  },
  {
    name: "SparkTag",
    icon: <IconTag size={56} className="futuristic-icon" />,
    description: "SparkTag brings order to chaos. Use smart, AI-driven tagging to organize everything—projects, documents, and conversations. Find what you need in a flash and keep your digital world perfectly indexed.",
  },
  {
    name: "SparkSpace",
    icon: <IconUsersGroup size={56} className="futuristic-icon" />,
    description: "SparkSpace is your collaborative universe. Create shared spaces for teams, departments, or communities. Enjoy secure access, customizable permissions, and a unified hub for all your work and communication.",
  },
];

export default function ServicesPage() {
  return (
    <main style={{ minHeight: '100vh', background: 'none', position: 'relative', zIndex: 1 }}>
      <div className="futuristic-hero-bg" />
      <section className="futuristic-section" style={{ textAlign: 'center', zIndex: 2 }}>
        <h1 className="holo-text" style={{ fontSize: '2.6rem', fontWeight: 900, marginBottom: 16 }}>Our Services</h1>
        <h2 className="neon-text" style={{ fontSize: '1.4rem', fontWeight: 600, marginBottom: 48 }}>Explore the Spark Suite</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 40 }}>
          {services.map((service) => (
            <div key={service.name} className="glass futuristic-animate" style={{ flex: '1 1 320px', minWidth: 280, maxWidth: 340, margin: 12, padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 8px 32px #232b4d44' }}>
              {service.icon}
              <h3 className="holo-text" style={{ fontWeight: 700, fontSize: 22, margin: '24px 0 12px' }}>{service.name}</h3>
              <p style={{ color: '#b0b7ff', fontSize: 17, lineHeight: 1.5 }}>{service.description}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
} 