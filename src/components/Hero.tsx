import { Aurora } from './Aurora';
import { DecryptedText } from './DecryptedText';
import { type Variants, motion } from 'framer-motion';

const container: Variants = {
    hidden: { opacity: 1 },
    visible: {
        opacity: 1,
        transition: {
            delayChildren: 1,
            staggerChildren: 0.5,
            when: 'beforeChildren',
        },
    },
};

const item: Variants = {
    hidden: {
        opacity: 0,
        y: 20,
    },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 1,
            ease: 'easeOut',
        },
    },
};

export const Hero = () => {
    return (
        <div className="flex h-screen w-screen flex-col items-start justify-center px-4 lg:px-40">
            <Aurora
                colorStops={['#ca9ee6', '#303446', '#ca9ee6']}
                className="absolute top-0 left-0 h-screen w-screen"
            />
            <div className="z-10 flex flex-wrap">
                <DecryptedText
                    parentClassName="font-bold text-center text-5xl lg:text-7xl lg:text-left"
                    text="Build better software with Albert."
                    className="[&:nth-child(n+27)]:text-[#ca9ee6] [&:nth-child(n+36)]:text-inherit"
                    encryptedClassName="[&:nth-child(n+27)]:text-[#ca9ee6] [&:nth-child(n+36)]:text-inherit"
                    speed={50}
                />
            </div>

            <motion.div
                className="z-10"
                initial="hidden"
                animate="visible"
                variants={container}
            >
                <motion.div
                    className="flex text-center text-lg font-normal lg:text-left lg:text-4xl"
                    variants={item}
                >
                    <p>
                        Albert is a software engineer with{' '}
                        <span className="text-[#ca9ee6]">
                            5+ years experience
                        </span>{' '}
                        building production applications
                    </p>
                </motion.div>

                <motion.div
                    className="mt-4 text-lg lg:text-2xl"
                    variants={item}
                >
                    <p>🚀Core competencies: Typescript, Python, PostgresSQL</p>
                    <p>⚡Currently: Full-stack @ Super.com</p>
                    <p>{`💬Let's chat about: React, Fintech, and mechanical keyboards`}</p>
                </motion.div>
            </motion.div>
        </div>
    );
};
