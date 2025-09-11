import { ExperienceRedesign } from './components/ExperienceRedesign';
import { Footer } from './components/Footer';
import { Hero } from './components/Hero';
import { Testimonials } from './components/Testimonials';

function App() {
    return (
        <div className="mx-auto flex w-screen flex-col items-center bg-[var(--pastel-green-4)]">
            <Hero />
            {/* <Experience /> */}
            <ExperienceRedesign />
            <Testimonials />
            <Footer />
        </div>
    );
}

export default App;
