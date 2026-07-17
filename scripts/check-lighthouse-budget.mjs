import { readFile } from 'node:fs/promises';

const budget = JSON.parse(
    await readFile(new URL('../lighthouse-budget.json', import.meta.url)),
);
const reportNames = ['mobile', 'desktop'];
let failed = false;

for (const name of reportNames) {
    const report = JSON.parse(
        await readFile(
            new URL(`../lighthouse-${name}.report.json`, import.meta.url),
        ),
    );
    const summary = {};

    for (const [category, minimum] of Object.entries(budget.categories)) {
        const score = report.categories[category]?.score;
        summary[category] = score;

        if (typeof score !== 'number' || score < minimum) {
            console.error(
                `${name}: ${category} score ${score ?? 'missing'} is below ${minimum}`,
            );
            failed = true;
        }
    }

    for (const [audit, maximum] of Object.entries(budget.audits)) {
        const value = report.audits[audit]?.numericValue;
        summary[audit] = value;

        if (typeof value !== 'number' || value > maximum) {
            console.error(
                `${name}: ${audit} ${value ?? 'missing'} exceeds ${maximum}`,
            );
            failed = true;
        }
    }

    console.log(`${name}: ${JSON.stringify(summary)}`);
}

if (failed) process.exitCode = 1;
