// import { Aurora } from './Aurora';
import HeroBottomSvg from '../assets/hero-bottom.svg?react';
import HeroTopSvg from '../assets/hero-top.svg?react';
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
        <div className="flex flex-col items-center gap-2">
            <HeroTopSvg
                className="absolute inset-0 left-1/2 w-full -translate-x-1/2 lg:w-4xl"
                style={{
                    objectFit: 'contain',
                }}
            />
            <HeroBottomSvg
                className="absolute inset-0 top-[135px] left-1/2 w-full -translate-x-1/2 lg:w-4xl"
                style={{
                    objectFit: 'contain',
                }}
            />
            <div className="z-10 flex w-full flex-wrap lg:w-4xl">
                <DecryptedText
                    parentClassName="font-bold text-center text-2xl md:text-3xl lg:text-left"
                    text="Build better software with Albert."
                    className="[&:nth-child(n+27)]:text-[#ca9ee6] [&:nth-child(n+36)]:text-inherit"
                    encryptedClassName="[&:nth-child(n+27)]:text-[#ca9ee6] [&:nth-child(n+36)]:text-inherit"
                    speed={50}
                />
            </div>

            <motion.div
                className="z-10 w-full lg:w-4xl"
                initial="hidden"
                animate="visible"
                variants={container}
            >
                <motion.div
                    className="flex w-full text-xl font-normal md:text-2xl lg:text-left"
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
                    className="mt-4 w-full text-base md:text-lg lg:text-2xl"
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
