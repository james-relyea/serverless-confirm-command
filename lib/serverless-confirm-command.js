const readline = require('readline');
const chalk = require('chalk');
const ServerlessConfirmCommandError = require('./serverless-confirm-command-error');

const has = Object.prototype.hasOwnProperty;

const confirmTypes = {
    argument: 'argument',
    typed: 'typed',
};

const consoleLog = message => process.stdout.write(`${message}\n`);

class ServerlessConfirmCommand {
    constructor(serverless, options) {
        this.options = options;
        this.serverless = serverless;
        this.provider = this.serverless.service.provider.name;
        this.command = null;
        if (serverless.processedInput.commands.length > 0) {
            this.command = serverless.processedInput.commands.join(' ').trim();
        }
        this.defaultConfiguration = {
            type: confirmTypes.argument,
            commands: [],
            aws: {
                stages: [],
                commandsForStages: [],
            },
        };
        this.hooks = {};
        this.buildCustomConfiguration();
    }

    buildCustomConfiguration() {
        // Make sure proper configuration exists, or set to default
        const hasCustomConfig =
            this.serverless.service.custom !== undefined &&
            has.call(this.serverless.service.custom, 'confirm');
        const providedConfiguration = hasCustomConfig
            ? this.serverless.service.custom.confirm
            : this.defaultConfiguration;
        // AWS-specific configuration
        if (!has.call(providedConfiguration, 'aws')) {
            providedConfiguration.aws = this.defaultConfiguration.aws;
        }
        providedConfiguration.aws = Object.assign(
            this.defaultConfiguration.aws,
            providedConfiguration.aws,
        );
        this.customConfig = Object.assign(this.defaultConfiguration, providedConfiguration);
        // eslint-disable-next-line no-restricted-syntax
        for (const cmd of this.customConfig.commands) {
            this.hooks[`before:${cmd}:${cmd}`] = this.checkConfirmation.bind(this);
        }
    }

    mustBeConfirmed() {
        const resultsToCheck = [];
        const commandMustBeConfirmed = this.customConfig.commands.includes(this.command);
        resultsToCheck.push(commandMustBeConfirmed);
        if (this.provider === 'aws') {
            const stageMustBeConfirmed = this.customConfig.aws.stages.includes(this.stage);
            const matchFound = this.customConfig.aws.commandsForStages.find(
                element => element === `${this.command}:${this.stage}`,
            );
            const pairMustBeConfirmed = matchFound !== undefined;
            resultsToCheck.push(stageMustBeConfirmed, pairMustBeConfirmed);
        }
        return resultsToCheck.includes(true);
    }

    static commandConfirmed() {
        consoleLog(`\n  Proceeding...`);
    }

    static commandNotConfirmed(confirmationType) {
        if (confirmationType === confirmTypes.typed) {
            consoleLog(chalk.red(`\n  Confirmation failed, aborting request.\n`));
        } else {
            consoleLog(
                chalk.red(
                    `\n  Confirmation failed. Use [--confirm] or change the configuration of the plugin.\n`,
                ),
            );
        }
        process.exit(1);
    }

    populateStage() {
        this.stage = this.provider === 'aws' ? this.serverless.providers.aws.getStage() : null;
    }

    async confirmationPrompt() {
        consoleLog(
            `\n\n${chalk.yellow('  Serverless Command Confirmation -------------------------')}`,
        );
        consoleLog(`\n     ${chalk.red('WARNING: Confirmation is required before you are able')}`);
        consoleLog(`     ${chalk.red('to proceed with execution.')}\n`);
        consoleLog(`${chalk.yellow('     Command:        ')}${chalk.yellow(this.command)}`);
        if (this.stage) {
            consoleLog(`${chalk.yellow('     Stage:          ')}${chalk.yellow(this.stage)}`);
        }
        consoleLog(' ');

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        return new Promise(resolve => {
            rl.question(
                `  To confirm, type the above listed command and press [Enter]: `,
                input => {
                    rl.close();
                    resolve(input);
                },
            );
        });
    }

    async checkConfirmation() {
        this.populateStage();
        if (this.mustBeConfirmed()) {
            let { confirm } = this.options;
            if (this.customConfig.type === confirmTypes.typed) {
                const response = await this.confirmationPrompt();
                confirm = this.command === response;
            }

            if (confirm) {
                this.constructor.commandConfirmed();
            } else {
                this.constructor.commandNotConfirmed(this.customConfig.type);
            }
        }
    }
}

module.exports = ServerlessConfirmCommand;
