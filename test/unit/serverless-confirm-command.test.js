// External dependencies
const { expect, use } = require('chai');
const dirtyChai = require('dirty-chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
// Local dependencies
const ServerlessConfirmCommand = require('../../src/serverless-confirm-command.js');
const helpers = require('./helpers');

use(sinonChai);
use(dirtyChai);

describe('Unit tests of the plugin - Common features', () => {
    it('should not fail if the configuration is missing', () => {
        const runTestWith = provider => {
            const plugin = helpers.constructPlugin([], null, {}, provider);
            const defaultConfiguration = {
                commands: [],
                aws: {
                    stages: [],
                    commandsForStages: [],
                },
            };
            expect(plugin.customConfig).to.deep.equal(defaultConfiguration);
        };
        helpers.testWithAllProviders(runTestWith, []);
    });

    it('should not require confirmation if the configuration is empty', () => {
        const runTestWith = (processedCommands, stage, custom, provider) => {
            const plugin = helpers.constructPlugin(processedCommands, stage, custom, provider);
            expect(plugin.mustBeConfirmed()).to.be.false();
        };
        helpers.testWithAllProviders(runTestWith, [['deploy'], null, {}]);
        helpers.testWithAllProviders(runTestWith, [['deploy'], undefined, {}]);
        helpers.testWithAllProviders(runTestWith, [['deploy'], '', {}]);
        helpers.testWithAllProviders(runTestWith, [['deploy'], [], {}]);
        helpers.testWithAllProviders(runTestWith, [['deploy'], {}, {}]);
        helpers.testWithAllProviders(runTestWith, [['deploy'], 'dev', {}]);
        helpers.testWithAllProviders(runTestWith, [['deploy'], 'prod', {}]);
        helpers.testWithAllProviders(runTestWith, [['deploy', 'another'], 'dev', {}]);
        helpers.testWithAllProviders(runTestWith, [['another', 'deploy'], 'prod', {}]);
    });

    it('should require confirmation if the command is listed', () => {
        const setupTestWith = commandList => {
            const runTestWith = (processedCommands, stage, custom, provider) => {
                const plugin = helpers.constructPlugin(processedCommands, stage, custom, provider);
                expect(plugin.mustBeConfirmed()).to.be.true();
            };
            const custom = helpers.buildCustomConfirm(commandList, [], []);
            helpers.testWithAllProviders(runTestWith, [['deploy'], null, custom]);
            helpers.testWithAllProviders(runTestWith, [['deploy'], undefined, custom]);
            helpers.testWithAllProviders(runTestWith, [['deploy'], '', custom]);
            helpers.testWithAllProviders(runTestWith, [['deploy'], [], custom]);
            helpers.testWithAllProviders(runTestWith, [['deploy'], {}, custom]);
            helpers.testWithAllProviders(runTestWith, [['deploy'], 'dev', custom]);
        };
        setupTestWith(['deploy']);
        setupTestWith(['deploy', 'another']);
        setupTestWith(['another', 'deploy']);
    });

    it('should not require confirmation if the command is not listed', () => {
        const setupTestWith = commandList => {
            const runTestWith = (processedCommands, stage, custom, provider) => {
                const plugin = helpers.constructPlugin(processedCommands, stage, custom, provider);
                expect(plugin.mustBeConfirmed()).to.be.false();
            };
            const custom = helpers.buildCustomConfirm(commandList, [], []);
            helpers.testWithAllProviders(runTestWith, [['deploy'], null, custom]);
            helpers.testWithAllProviders(runTestWith, [['deploy'], undefined, custom]);
            helpers.testWithAllProviders(runTestWith, [['deploy'], '', custom]);
            helpers.testWithAllProviders(runTestWith, [['deploy'], [], custom]);
            helpers.testWithAllProviders(runTestWith, [['deploy'], {}, custom]);
            helpers.testWithAllProviders(runTestWith, [['deploy'], 'dev', custom]);
        };
        setupTestWith([]);
        setupTestWith(['remove']);
        setupTestWith(['remove', 'another']);
        setupTestWith(['another', 'remove']);
    });

    it('should print the proper error if confirmation is required and not provided', () => {
        const runTestWith = provider => {
            const runTest = () => {
                const custom = helpers.buildCustomConfirm(['deploy'], [], []);
                const plugin = helpers.constructPlugin(['deploy'], 'dev', custom, provider);
                plugin.checkConfirmation();
            };
            expect(runTest).to.throw();
        };
        helpers.testWithAllProviders(runTestWith, []);
    });

    it('should print the proper message if confirmation is required and provided', () => {
        const runTestWith = provider => {
            const custom = helpers.buildCustomConfirm(['deploy'], [], []);
            const serverless = helpers.buildServerless(['deploy'], 'dev', custom, provider);
            const options = { confirm: true };
            const plugin = new ServerlessConfirmCommand(serverless, options);
            const spy = sinon.spy(plugin, 'serverlessLog');
            plugin.checkConfirmation();
            expect(spy).to.have.been.calledOnce();
            spy.restore();
        };
        helpers.testWithAllProviders(runTestWith, []);
    });

    it('should print nothing if confirmation is not required', () => {
        const runTestWith = provider => {
            const custom = helpers.buildCustomConfirm([], [], []);
            const plugin = helpers.constructPlugin(['deploy'], 'dev', custom, provider);
            const spy = sinon.spy(plugin, 'serverlessLog');
            plugin.checkConfirmation();
            expect(spy).to.not.have.been.called();
            spy.restore();
        };
        helpers.testWithAllProviders(runTestWith, []);
    });
});

describe('Unit tests of the plugin - AWS features', () => {
    it('should require confirmation if the stage is listed', () => {
        const setupTestWith = stageList => {
            const runTestWith = (processedCommands, stage, custom) => {
                const plugin = helpers.constructPlugin(processedCommands, stage, custom, 'aws');
                plugin.populateStage();
                expect(plugin.mustBeConfirmed()).to.be.true();
            };
            const custom = helpers.buildCustomConfirm([], stageList, []);
            runTestWith([], 'dev', custom);
            runTestWith(['deploy', 'another'], 'dev', custom);
        };
        setupTestWith(['dev']);
        setupTestWith(['dev', 'prod']);
        setupTestWith(['prod', 'dev']);
    });

    it('should not require confirmation if the stage is not listed', () => {
        const setupTestWith = stageList => {
            const runTestWith = (processedCommands, stage, custom) => {
                const plugin = helpers.constructPlugin(processedCommands, stage, custom, 'aws');
                expect(plugin.mustBeConfirmed()).to.be.false();
            };
            const custom = helpers.buildCustomConfirm([], stageList, []);
            runTestWith([], 'dev', custom);
            runTestWith(['deploy', 'another'], 'dev', custom);
            runTestWith(['another', 'deploy'], 'dev', custom);
        };
        setupTestWith([]);
        setupTestWith(['prod']);
        setupTestWith(['prod', 'test']);
        setupTestWith(['test', 'prod']);
    });

    it('should require confirmation if the command and stage pair is listed', () => {
        const setupTestWith = commandsForStagesList => {
            const runTestWith = (processedCommands, stage, custom) => {
                const plugin = helpers.constructPlugin(processedCommands, stage, custom, 'aws');
                plugin.populateStage();
                expect(plugin.mustBeConfirmed()).to.be.true();
            };
            const custom = helpers.buildCustomConfirm([], [], commandsForStagesList);
            runTestWith(['deploy'], 'prod', custom);
            runTestWith(['deploy', 'another'], 'prod', custom);
        };
        setupTestWith(['deploy:prod']);
        setupTestWith(['deploy:prod', 'deploy:dev']);
        setupTestWith(['deploy:prod', 'remove:dev']);
    });

    it('should not require confirmation if the command and stage pair is not listed', () => {
        const setupTestWith = commandsForStagesList => {
            const runTestWith = (processedCommands, stage, custom) => {
                const plugin = helpers.constructPlugin(processedCommands, stage, custom, 'aws');
                expect(plugin.mustBeConfirmed()).to.be.false();
            };
            const custom = helpers.buildCustomConfirm([], [], commandsForStagesList);
            runTestWith(['deploy'], 'dev', custom);
            runTestWith(['deploy', 'another'], 'dev', custom);
            runTestWith(['another', 'deploy'], 'dev', custom);
        };
        setupTestWith(['deploy:prod']);
        setupTestWith(['deploy:prod', 'deploy:test']);
        setupTestWith(['deploy:prod', 'remove:dev']);
    });
});