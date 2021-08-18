/* eslint-disable no-restricted-syntax */
/* eslint-disable complexity */
import execa from 'execa';
import chalk from 'chalk';
import { join } from 'path';
import standardVersion from 'standard-version';
//@ts-ignore
import { npmPublish } from '@lerna/npm-publish';
//@ts-ignore
import npmConf from '@lerna/npm-conf';
import crypto from 'crypto';
//@ts-ignore
import Package from '@lerna/package';
// import getRepoInfo from 'git-repo-info';
import packDirectory from './pack-directory';
import exec from '../utils/exec';

const lazy = Package.Package.lazy;
const REGISTRY = 'http://localhost:8073/repository/dsx/';
const NEXUS_TOKEN = 'YWRtaW46ODc2MzM3';

function userAgent() {
  // consumed by npm-registry-fetch (via libnpmpublish)
  return `lerna/4.0.0/node@${process.version}+${process.arch} (${process.platform})`;
}

function printErrorAndExit(message: string) {
  console.error(chalk.red(message));
  process.exit(1);
}

function logStep(name: string) {
  console.log(`${chalk.gray('>> Release:')} ${chalk.magenta.bold(name)}`);
}

/**
 * pulish 发布流程
 *
 * 1、校验本地git status状态，如果是skip ｜ publishOnly 则跳过检测，否则本地改动都要commit
 * 2、分lerna还是normal模式获取要发布的包
 *    1、如果是normal则获取--package ｜ 当前process.cwd
 *    2、如果是lerna则按照lerna的方式获取更新包
 *    3、还有一种情况就是虽然--mode=lerna，但是获取lerna出现错误，则降级为normal
 *
 * 2、遍历需要发布的包一次进行发布
 *    1、是否仅仅是发布，而不是要
 *    2、Check npm registry
 *
 */

export default async function release(cwd = process.cwd(), args: any): Promise<void> {
  // Check git status
  if (!args.skipGitStatusCheck && !args.publishOnly) {
    const gitStatus = execa.sync('git', ['status', '--porcelain']).stdout;
    if (gitStatus.length) {
      printErrorAndExit(`Your git status is not clean. Aborting.`);
    }
  } else {
    logStep('git status check is skipped, since --skip-git-status-check is supplied');
  }

  const npmSession = crypto.randomBytes(8).toString('hex');

  const conf = npmConf({
    lernaCommand: 'publish',
    _auth: args.legacyAuth || NEXUS_TOKEN,
    npmSession: args.npmSession || npmSession,
    npmVersion: args.userAgent || userAgent(),
    registry: REGISTRY //args.registry ||
  });

  // Check npm registry
  logStep('check npm registry');
  const userRegistry = execa.sync('npm', ['config', 'get', 'registry']).stdout;
  if (userRegistry.includes('https://registry.yarnpkg.com/')) {
    printErrorAndExit(`Release failed, please use ${chalk.blue('npm run release')}.`);
  }
  if (!userRegistry.includes('https://registry.npmjs.org/')) {
    const registry = chalk.blue('https://registry.npmjs.org/');
    printErrorAndExit(`Release failed, npm registry must be ${registry}.`);
  }

  let updated = null;

  if (!args.publishOnly) {
    // Get updated packages
    logStep('check updated packages');
    let updatedStdout;
    if (args.mode === 'lerna') {
      //TODO lerna类似的文件结构后续支持
      updatedStdout = [];
    } else {
      updatedStdout = args.package ? args.package : [lazy(join(cwd, 'package.json'))];
    }

    updated = updatedStdout;

    if (!updated.length) {
      printErrorAndExit('Release failed, no updated package is updated.');
    }

    // Clean
    logStep('clean');

    // Build
    if (!args.skipBuild) {
      logStep('build');
      // let build;
      // if (args.vmi) {
      //   // eslint-disable-next-line @typescript-eslint/no-var-requires
      //   build = require('@winfe/vmi').runCli;
      // } else {
      //   // eslint-disable-next-line node/no-missing-require
      //   build = require('../build/index');
      // }
      // await build(args);
    } else {
      logStep('build is skipped, since args.skipBuild is supplied');
    }

    logStep('bump version with standard-version version');

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const _ of updated.entries()) {
      const versionCliArgs: standardVersion.Options = {
        skip: {
          // commit: true,
          // tag: true
        }
      };
      const resolvePrereleaseId = args.release;

      if (['patch', 'minor', 'major'].includes(resolvePrereleaseId)) {
        versionCliArgs.releaseAs = resolvePrereleaseId;
      }

      if (['prepatch', 'preminor', 'premajor'].includes(resolvePrereleaseId)) {
        versionCliArgs.releaseAs = resolvePrereleaseId.split('pre')[1];
        versionCliArgs.prerelease = 'beta';
      }

      if (!resolvePrereleaseId) printErrorAndExit('Release failed, no release type.');

      await standardVersion(versionCliArgs);
    }

    // Push all
    logStep(`git push`);
    // const { branch } = getRepoInfo();
    // await exec('git', ['push', 'origin', branch, '--tags']);
  }

  // Publish
  // eslint-disable-next-line no-nested-ternary
  const releasePkgs = args.publishOnly
    ? args.package
      ? args.package
      : [lazy(join(cwd, 'package.json'))]
    : updated;

  logStep(`publish packages: ${chalk.blue(releasePkgs.map((pck: any) => `${pck.name},`))}`);

  // token权限比auth高，为了防止token覆盖auth，每次都重置下配置
  // 我也没办法，lerna留的坑，lerna应该没有兼容最新版npm-registry-fetch
  await exec('npm', ['config', 'set', `//localhost:8073/repository/dsx/:_authToken=`]);

  for (const [index, pkg] of releasePkgs.entries()) {
    await pkg.refresh();
    console.log(`[${index + 1}/${releasePkgs.length}] Publish package ${pkg.name} ${pkg.version}`);
    pkg.packed = await packDirectory(pkg, pkg.location, args);
    const tag = execa.sync('git', ['describe', '--abbrev=0', '--tags']).stdout;

    const opts = Object.assign(conf.snapshot, {
      // distTag defaults to "latest" OR whatever is in pkg.publishConfig.tag
      // if we skip temp tags we should tag with the proper value immediately
      tag: conf.get('tag')
    });

    const pkgOpts = {
      ...args,
      ...opts,
      ...{
        tag
      }
    };

    await npmPublish(pkg, pkg.packed.tarFilePath, pkgOpts);
    logStep(`published: ${chalk.blue(pkg.name, pkg.version)}`);
  }

  logStep('done');
}
