import { ExperienceRow } from './ExperienceRow';
import { useState } from 'react';

const jobs = [
    {
        company: 'SUPER.COM',
        role: 'Software Engineer',
        duration: 'May 2024 - Present',
        bullets: [
            <p>
                <span className="text-[#ca9ee6]">
                    Led the architecturing and implementation
                </span>{' '}
                of idempotent balance transfer service, facilitating seamless
                migration of <span className="text-[#ca9ee6]">350k users</span>{' '}
                from a legacy program
            </p>,
            <p>
                Implemented new onboarding pathway for users with insufficient
                funds, resulting in a{' '}
                <span className="text-[#ca9ee6]">
                    10% lift in new subscriptions
                </span>
            </p>,
            <p>
                Reduced runtime in Airflow jobs by{' '}
                <span className="text-[#ca9ee6]">up to 30%</span> through
                database backfill and query optimization
            </p>,
            <p>
                Collaborated closely with founders and relevant teams to{' '}
                <span className="text-[#ca9ee6]">resolve app-wide</span>{' '}
                autofill issues through an in-house component library
            </p>,
        ],
    },
    {
        company: 'KONRAD GROUP',
        role: 'Software Engineer II',
        duration: 'Oct 2020 - Aug 2023',
        bullets: [
            <p>
                Delivered high quality, robust production code, with proven
                results of{' '}
                <span className="text-[#ca9ee6]">
                    doubling traffic and engagement
                </span>{' '}
                for several high-profile clientele including Kia Canada,
                Cadillac Fairview, Marks & Spencer, and Autozone
            </p>,
            <p>
                Collaborated seamlessly with design, product, engineering, and
                stakeholder teams to bring client creative concepts to life,
                reaching{' '}
                <span className="text-[#ca9ee6]">
                    6.5m+ in organic monthly traffic
                </span>{' '}
                across total projects
            </p>,
            <p>
                Tested and resolved accessibility issues on all projects,
                reaching Web Content Accessibility Guidelines{' '}
                <span className="text-[#ca9ee6]">
                    (WCAG) 2.1 Level AA compliance
                </span>
            </p>,
        ],
    },
    {
        company: 'MAGNET FORENSICS',
        role: 'Software Intern',
        duration: 'Jan 2018 - Aug 2019',
        bullets: [
            <p>
                <span className="text-[#ca9ee6]">
                    Architected and implemented
                </span>{' '}
                several data parsing features in Magnet Axiom used in forensic
                cases by{' '}
                <span className="text-[#ca9ee6]">
                    4000+ law enforcement and corporate customers worldwide
                </span>
                , including the FBI, Department of Homeland Security, and LAPD
            </p>,
            <p>
                <span className="text-[#ca9ee6]">Led the development</span> of
                GSuite parsing features within Axiom, such as user sign-in, API
                integration and retries, extending potential customer base to{' '}
                <span className="text-[#ca9ee6]">millions of businesses</span>{' '}
                leveraging Google Workspace
            </p>,
        ],
    },
];

export const Experience = () => {
    const [expandedId, setExpandedId] = useState<number | null>(null);

    return (
        <div className="flex max-h-[800px] w-screen flex-col items-center py-8">
            <div className="w-full pb-2">
                <h3 className="w-full text-center text-2xl font-bold md:text-5xl lg:text-7xl">
                    Trusted by North American{' '}
                    <span className="text-[#ca9ee6]">Tech Leaders</span>
                </h3>
            </div>
            <div className="mt-4 w-screen overflow-y-auto">
                {jobs.map((item, index) => (
                    <ExperienceRow
                        key={index}
                        id={index}
                        company={item.company}
                        role={item.role}
                        duration={item.duration}
                        bullets={item.bullets}
                        isExpanded={expandedId === index}
                        onExpand={setExpandedId}
                    />
                ))}
            </div>
        </div>
    );
};
