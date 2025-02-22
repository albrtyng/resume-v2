import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

const useIsTouchDevice = () => {
    const [isTouch, setIsTouch] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            setIsTouch(window.matchMedia('(hover: none)').matches);
        };

        handleResize();
        window.addEventListener('resize', handleResize);

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return isTouch;
};

interface ExperienceRowProps {
    id: number;
    company: string;
    role: string;
    duration: string;
    bullets: React.ReactNode[];
    isExpanded: boolean;
    onExpand: (id: number | null) => void;
}

const keyframes = `
    @keyframes gradient {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
    }
`;

const gradientOverlayStyle = {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    bottom: 0,
    height: '2px',
    backgroundImage:
        'linear-gradient(90deg, #ca9ee6, #ca9ee6, white, #ca9ee6, #ca9ee6)',
    backgroundSize: '300% 100%',
    animation: 'gradient 3s linear infinite',
    zIndex: 0,
    pointerEvents: 'none',
} as const;

export const ExperienceRow = ({
    id,
    company,
    role,
    duration,
    bullets,
    isExpanded,
    onExpand,
}: ExperienceRowProps) => {
    const isTouch = useIsTouchDevice();

    return (
        <>
            <style>{keyframes}</style>
            <motion.div
                className={`relative flex w-full cursor-pointer flex-col items-center justify-center py-10 ${
                    isExpanded ? 'bg-[#232634]' : ''
                }`}
                onClick={() => {
                    if (isTouch) {
                        onExpand(isExpanded ? null : id);
                    }
                }}
                onHoverStart={() => {
                    if (!isTouch) {
                        onExpand(id);
                    }
                }}
                onHoverEnd={() => {
                    if (!isTouch) {
                        onExpand(null);
                    }
                }}
                initial={false}
            >
                <motion.div
                    style={gradientOverlayStyle}
                    animate={{
                        width: isExpanded ? '100vw' : 'min(56rem, 100%)',
                    }}
                    initial={{ width: 'min(56rem, 100%)' }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                />
                <div className="flex w-full max-w-4xl overflow-hidden px-2 text-lg font-semibold md:px-4 md:text-2xl lg:text-4xl">
                    <h4 className="sr-only">{`0${id + 1} ${company}${isExpanded ? `: ${role}` : ''}`}</h4>
                    <h4
                        aria-hidden="true"
                        className="text-[#8c8fa1]"
                    >{`0${id + 1}`}</h4>
                    <div className="ml-2 flex">
                        <h4 aria-hidden="true" className="text-white">
                            {company}
                        </h4>
                        <div className="relative">
                            <motion.h4
                                aria-hidden="true"
                                className="text-white"
                                initial={{ y: 48 }}
                                animate={{
                                    y: isExpanded ? 0 : 48,
                                }}
                                transition={{
                                    duration: 0.3,
                                    ease: 'easeInOut',
                                }}
                            >
                                {`: ${role}`}
                            </motion.h4>
                        </div>
                    </div>
                </div>
                <motion.div
                    animate={{
                        height: isExpanded ? 'auto' : 0,
                        opacity: isExpanded ? 1 : 0,
                    }}
                    initial={{ height: 0, opacity: 0 }}
                    transition={{
                        height: {
                            type: 'tween',
                            ease: 'easeInOut',
                            duration: 0.3,
                        },
                        opacity: { duration: 0.3 },
                    }}
                    className="flex max-w-4xl flex-col items-center space-y-2 overflow-hidden px-2 md:px-4"
                    aria-hidden={!isExpanded}
                >
                    <p className="mt-4 w-full text-left text-xs text-white md:text-base lg:text-lg">
                        {duration}
                    </p>
                    <ul className="ml-4 list-disc text-sm text-white md:text-lg lg:text-xl">
                        {bullets.map((bullet, index) => (
                            <li className="text-left" key={index}>
                                {bullet}
                            </li>
                        ))}
                    </ul>
                </motion.div>
            </motion.div>
        </>
    );
};
