export interface CapabilityGroup {
    number: string;
    eyebrow: string;
    title: string;
    description: string;
    tools: readonly string[];
}

export const capabilityGroups = [
    {
        number: '01',
        eyebrow: 'Product surfaces',
        title: 'Interface craft',
        description:
            'Readable, resilient interfaces with accessibility treated as part of the build.',
        tools: ['TypeScript', 'React', 'WCAG 2.1 AA'],
    },
    {
        number: '02',
        eyebrow: 'Data systems',
        title: 'Pipelines & queries',
        description:
            'Practical data workflows, backfills and query work that keep products moving.',
        tools: ['Python', 'SQL', 'Snowflake', 'Airflow'],
    },
    {
        number: '03',
        eyebrow: 'Production delivery',
        title: 'Services that hold up',
        description:
            'API delivery, containerized workflows and reliable paths through retries and change.',
        tools: ['Docker', 'GitLab', 'API integration'],
    },
    {
        number: '04',
        eyebrow: 'Shared context',
        title: 'Cross-functional work',
        description:
            'Close collaboration across product, design, engineering and stakeholder teams.',
        tools: ['Product', 'Design', 'Engineering', 'Stakeholders'],
    },
] as const satisfies readonly CapabilityGroup[];
