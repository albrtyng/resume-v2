import type { ImageMetadata } from 'astro';
import creditCard from '../assets/images/credit-card.png';
import websiteUnderMaintenance from '../assets/images/website-under-maintenance.png';
import magnet from '../assets/images/magnet.png';

export interface Bullet {
    text: string;
    highlights: string[];
}

export interface Job {
    company: string;
    role: string;
    duration: string;
    bullets: Bullet[];
    url: string;
    image?: ImageMetadata;
    imageAlt?: string;
}

export const jobs: Job[] = [
    {
        company: 'Super.com',
        role: 'Software Engineer II',
        duration: 'May 2024 — Present',
        url: 'https://www.linkedin.com/in/albrtyng/',
        image: creditCard,
        imageAlt: 'Credit card illustration',
        bullets: [
            {
                text: 'Led the architecturing and implementation of idempotent balance transfer service, facilitating seamless migration of 350k users from a legacy program',
                highlights: [
                    'Led the architecturing and implementation',
                    '350k users',
                ],
            },
            {
                text: 'Implemented new onboarding pathway for users with insufficient funds, resulting in a 10% lift in new subscriptions',
                highlights: ['10% lift in new subscriptions'],
            },
            {
                text: 'Reduced runtime in Airflow jobs by up to 30% through database backfill and query optimization',
                highlights: ['up to 30%'],
            },
            {
                text: 'Collaborated closely with founders and relevant teams to resolve app-wide autofill issues through an in-house component library',
                highlights: ['resolve app-wide'],
            },
        ],
    },
    {
        company: 'Konrad Group',
        role: 'Software Engineer II',
        duration: 'Oct 2020 — Aug 2023',
        url: 'https://www.linkedin.com/in/albrtyng/',
        image: websiteUnderMaintenance,
        imageAlt: 'Website under maintenance illustration',
        bullets: [
            {
                text: 'Delivered high quality, robust production code, with proven results of doubling traffic and engagement for several high-profile clientele including Kia Canada, Cadillac Fairview, Marks & Spencer, and Autozone',
                highlights: ['doubling traffic and engagement'],
            },
            {
                text: 'Collaborated seamlessly with design, product, engineering, and stakeholder teams to bring client creative concepts to life, reaching 6.5m+ in organic monthly traffic across total projects',
                highlights: ['6.5m+ in organic monthly traffic'],
            },
            {
                text: 'Tested and resolved accessibility issues on all projects, reaching Web Content Accessibility Guidelines (WCAG) 2.1 Level AA compliance',
                highlights: ['(WCAG) 2.1 Level AA compliance'],
            },
        ],
    },
    {
        company: 'Magnet Forensics',
        role: 'Software Intern',
        duration: 'Jan 2018 — Aug 2019',
        url: 'https://www.linkedin.com/in/albrtyng/',
        image: magnet,
        imageAlt: 'Magnet illustration',
        bullets: [
            {
                text: 'Architected and implemented several data parsing features in Magnet Axiom used in forensic cases by 4000+ law enforcement and corporate customers worldwide, including the FBI, Department of Homeland Security, and LAPD',
                highlights: [
                    'Architected and implemented',
                    '4000+ law enforcement and corporate customers worldwide',
                ],
            },
            {
                text: 'Led the development of GSuite parsing features within Axiom, such as user sign-in, API integration and retries, extending potential customer base to millions of businesses leveraging Google Workspace',
                highlights: ['Led the development', 'millions of businesses'],
            },
        ],
    },
];
