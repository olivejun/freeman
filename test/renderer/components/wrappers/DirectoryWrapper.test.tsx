import { expect } from "chai";
import Enzyme, { mount, shallow } from "enzyme";
import ReactSixteenAdapter from "enzyme-adapter-react-16";
import * as React from "react";
import { HotKeys, HotKeysProps } from "react-hotkeys";
import "reflect-metadata";
import Sinon, { SinonSandbox } from "sinon";
import { IMock, It, Mock, Times } from "typemoq";

import { DirectoryWrapper } from "components/wrappers";
import { IDirectoryManager, ISettingsManager } from "managers";
import { IHandlers, IStatusNotifier } from "models";
import { IIntegratedTerminal, IPersister } from "objects";
import { IDirectoryWrapperProps } from "props/wrappers";
import applicationSettings from "settings/internal/settings";
import applicationTheme from "settings/internal/themes/dark";
import { IDirectoryWrapperState } from "states/panels";
import Utils from "Utils";

Enzyme.configure({ adapter: new ReactSixteenAdapter() });

describe("<DirectoryWrapper />", () => {
    let props: IDirectoryWrapperProps;
    let component: React.ReactElement<IDirectoryWrapperProps>;

    let sandbox: SinonSandbox;

    let directoryManager: IMock<IDirectoryManager>;
    let settingsManager: IMock<ISettingsManager>;
    let integratedTerminal: IMock<IIntegratedTerminal>;
    let persister: IMock<IPersister>;

    beforeEach(() => {
        directoryManager = Mock.ofType<IDirectoryManager>();
        settingsManager = Mock.ofType<ISettingsManager>();
        settingsManager.setup(sm => sm.settings).returns(() => applicationSettings);
        integratedTerminal = Mock.ofType<IIntegratedTerminal>();
        integratedTerminal.setup(it => it.shellName).returns(() => "bash");
        persister = Mock.ofType<IPersister>();

        const statusNotifier = {} as IStatusNotifier;

        directoryManager = Mock.ofType<IDirectoryManager>();

        props = {
            directoryManager: directoryManager.object,
            id: "left",
            integratedTerminal: integratedTerminal.object,
            isSelectedPane: true,
            persister: persister.object,
            sendSelectedPaneUp: () => { },
            settingsManager: settingsManager.object,
            statusNotifier,
            theme: applicationTheme
        };

        component = <DirectoryWrapper {...props} />;
        sandbox = Sinon.createSandbox();
        directoryManager.setup(async dm => dm.listDirectory(It.isAnyString(), It.isAny()))
            .returns(sandbox.stub().resolves([]));
    });

    afterEach(() => {
        sandbox && sandbox.restore();
    });

    it("contains a <div /> with the className 'DirectoryWrapper'", () => {
        const wrapper = shallow(component);

        expect(wrapper.findWhere(n => n.hasClass("DirectoryWrapper")))
            .to.have.length(1);
    });

    it("contains a container with the className 'directoryScrollArea'", () => {
        const wrapper = shallow(component);

        expect(wrapper.findWhere(n => n.hasClass("directoryScrollArea")))
            .to.have.length(1);
    });

    it("re-renders only once when updating path", () => {
        const wrapper = shallow(component);
        const renderSpy = sandbox.spy(DirectoryWrapper.prototype, "render");
        wrapper.setState({ updatePath: "/new/path" });

        expect(renderSpy.callCount).to.equal(1);
    });

    it("can toggle the display of the integrated terminal", () => {
        const wrapper = shallow(component);
        const hotkeys = wrapper.find(HotKeys);
        const hotkeysProps = hotkeys.props() as HotKeysProps;
        expect(hotkeysProps.handlers).to.exist;
        const preState = wrapper.state() as IDirectoryWrapperState;
        (hotkeysProps.handlers as IHandlers)
            .toggleIntegratedTerminal();
        const postState = wrapper.state() as IDirectoryWrapperState;

        expect(postState.isTerminalOpen).to.not.equal(preState.isTerminalOpen);
    });

    it("sets focus when closing the integrated terminal", () => {
        const wrapper = mount(component);
        wrapper.setState({ isTerminalOpen: true } as IDirectoryWrapperState);
        const autoFocusStub = sandbox.stub(Utils, "autoFocus");

        const hotkeys = wrapper.find(HotKeys).first();
        const hotkeysProps = hotkeys.props() as HotKeysProps;
        expect(hotkeysProps.handlers).to.exist;
        (hotkeysProps.handlers as IHandlers)
            .toggleIntegratedTerminal();

        expect(autoFocusStub.calledOnce).to.be.true;
    });

    it("retrieves whether a terminal is open when setting to open terminal on start up is not configured", () => {
        shallow(component);

        persister.verify(p => p.get<boolean>(`terminal.${props.id}.isOpen`), Times.once());
    });

    it("persists whether the terminal is open or closed when terminal toggled", () => {
        const terminalPreviousState = false;
        const wrapper = shallow(component);
        wrapper.setState({ isTerminalOpen: terminalPreviousState } as IDirectoryWrapperState);
        const hotkeys = wrapper.find(HotKeys).first();
        const hotkeysProps = hotkeys.props() as HotKeysProps;
        (hotkeysProps.handlers as IHandlers).toggleIntegratedTerminal();

        persister.verify(p => p.set<boolean>(`terminal.${props.id}.isOpen`, !terminalPreviousState), Times.once());
    });
});
