#!/usr/bin/env node
/**
 * Sanctify SEO Auditor - CLI
 */

const path = require('path');
const fs = require('fs');
const http = require('http');
const { Command } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const handler = require('serve-handler');

const SeoEngine = require('../src/engine');
const ReportManager = require('../src/report');
const DashboardBuilder = require('../src/dashboard-builder');
const HistoryDashboard = require('../src/history-dashboard');

const program = new Command();
const AUDITS_DIR = path.join(process.cwd(), 'audits');

program
  .name('sanctify-seo')
  .description('Technical SEO audit tool with interactive dashboard')
  .version('1.0.0');

program
  .command('audit')
  .description('Run a technical SEO audit against a URL')
  .argument('<url>', 'URL to audit (e.g. https://www.cpofficial.in)')
  .option('-t, --timeout <ms>', 'Navigation timeout in ms', '60000')
  .option('--no-headless', 'Run with a visible browser (debug)')
  .option('-o, --output <dir>', 'Audits output directory', AUDITS_DIR)
  .option('--no-html', 'Skip generating the standalone HTML report')
  .action(async (url, opts) => {
    printBanner();
    const engine = new SeoEngine({
      timeout: parseInt(opts.timeout, 10),
      headless: opts.headless
    });

    const spinner = ora({ text: 'Starting audit...', color: 'magenta' }).start();
    const result = await engine.audit(url, (msg) => {
      spinner.text = msg;
    });
    spinner.stop();

    if (result.error && result.categories.length === 0) {
      console.log(chalk.red(`\n✖ Audit failed: ${result.error}\n`));
      process.exit(1);
    }

    printResults(result);

    // Persist outputs
    const reportManager = new ReportManager(opts.output);
    let htmlRelPath = null;

    if (opts.html) {
      const builder = new DashboardBuilder(opts.output);
      const htmlName = `report__${reportManager.slugify(result.url)}__${result.timestamp.replace(/[:.]/g, '-')}.html`;
      const htmlPath = builder.build(result, htmlName);
      htmlRelPath = htmlName;
      // Also write/refresh "latest.html" for convenience
      const latestPath = path.join(opts.output, 'latest.html');
      fs.copyFileSync(htmlPath, latestPath);
      var _htmlPath = htmlPath;
      var _latestPath = latestPath;
    }

    const jsonPath = reportManager.save(result, { htmlFile: htmlRelPath });
    console.log(chalk.gray(`\nJSON report:  ${jsonPath}`));

    if (opts.html) {
      console.log(chalk.gray(`HTML report:  ${_htmlPath}`));
      console.log(chalk.cyan(`Latest report: ${_latestPath}`));

      // Refresh the history dashboard
      const history = new HistoryDashboard(opts.output);
      history.build(reportManager.getIndex());
      console.log(chalk.gray(`Dashboard:    ${path.join(opts.output, 'dashboard.html')}`));
    }

    console.log(
      chalk.magenta(
        `\nTip: run ${chalk.bold('sanctify-seo serve')} to open the interactive dashboard.\n`
      )
    );
  });

program
  .command('serve')
  .description('Serve the audits folder and interactive dashboard over HTTP')
  .option('-p, --port <port>', 'Port', '4321')
  .option('-d, --dir <dir>', 'Audits directory to serve', AUDITS_DIR)
  .action((opts) => {
    if (!fs.existsSync(opts.dir)) {
      fs.mkdirSync(opts.dir, { recursive: true });
    }
    // Ensure dashboard exists
    const reportManager = new ReportManager(opts.dir);
    const history = new HistoryDashboard(opts.dir);
    history.build(reportManager.getIndex());

    const server = http.createServer((req, res) => {
      return handler(req, res, {
        public: opts.dir,
        cleanUrls: false,
        directoryListing: true,
        rewrites: [{ source: '/', destination: '/dashboard.html' }]
      });
    });

    server.listen(parseInt(opts.port, 10), () => {
      printBanner();
      console.log(chalk.green(`Dashboard server running:`));
      console.log(chalk.cyan.bold(`  http://localhost:${opts.port}/`));
      console.log(chalk.gray(`  Serving: ${opts.dir}\n`));
      console.log(chalk.gray('Press Ctrl+C to stop.\n'));
    });
  });

program
  .command('list')
  .description('List previous audits')
  .option('-d, --dir <dir>', 'Audits directory', AUDITS_DIR)
  .action((opts) => {
    const reportManager = new ReportManager(opts.dir);
    const index = reportManager.getIndex();
    if (index.length === 0) {
      console.log(chalk.yellow('No audits found yet. Run an audit first.'));
      return;
    }
    console.log(chalk.bold('\nPrevious audits:\n'));
    index.forEach((a) => {
      const c = a.overallScore >= 80 ? chalk.green : a.overallScore >= 60 ? chalk.yellow : chalk.red;
      console.log(
        `  ${c(String(a.overallScore).padStart(3))} (${a.grade})  ${chalk.gray(
          new Date(a.timestamp).toLocaleString()
        )}  ${a.url}`
      );
    });
    console.log('');
  });

function printBanner() {
  console.log(
    chalk.magenta.bold('\n  ╔═══════════════════════════════════════════╗')
  );
  console.log(
    chalk.magenta.bold('  ║') +
      chalk.white.bold('       SANCTIFY · Technical SEO Auditor      ') +
      chalk.magenta.bold('║')
  );
  console.log(
    chalk.magenta.bold('  ╚═══════════════════════════════════════════╝\n')
  );
}

function gradeColor(score) {
  if (score >= 80) return chalk.green;
  if (score >= 60) return chalk.yellow;
  return chalk.red;
}

function printResults(result) {
  const c = gradeColor(result.overallScore);
  console.log(chalk.bold(`\nResults for ${chalk.cyan(result.url)}\n`));
  console.log(
    `  Overall Score: ${c.bold(result.overallScore + '/100')}  Grade: ${c.bold(result.grade)}`
  );
  console.log(
    `  ${chalk.green(result.summary.passed + ' passed')}  ` +
      `${chalk.yellow(result.summary.warnings + ' warnings')}  ` +
      `${chalk.red(result.summary.failed + ' failed')}  ` +
      `(${result.summary.totalChecks} checks)\n`
  );

  console.log(chalk.bold('  Category Scores:'));
  result.categories.forEach((cat) => {
    const cc = gradeColor(cat.score);
    const bar = makeBar(cat.score);
    console.log(
      `    ${cat.name.padEnd(28)} ${cc(bar)} ${cc(String(cat.score).padStart(3))}`
    );
  });

  if (result.topRecommendations && result.topRecommendations.length) {
    console.log(chalk.bold('\n  Top Recommendations:'));
    result.topRecommendations.slice(0, 8).forEach((r, i) => {
      const pri = r.severity === 'high' ? chalk.red('[HIGH]') : chalk.yellow('[MED] ');
      console.log(`    ${pri} ${chalk.gray(r.category + ':')} ${r.recommendation}`);
    });
  }
}

function makeBar(score) {
  const total = 20;
  const filled = Math.round((score / 100) * total);
  return '█'.repeat(filled) + '░'.repeat(total - filled);
}

program.parseAsync(process.argv);
