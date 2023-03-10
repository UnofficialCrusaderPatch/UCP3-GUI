import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import {
  Button,
  Col,
  Container,
  ListGroup,
  Row,
  Tooltip,
} from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { Extension } from 'config/ucp/common';
import ExtensionDependencySolver from 'config/ucp/extension-dependency-solver';
import {
  useExtensions,
  useExtensionStateReducer,
  useSetActiveExtensions,
} from 'hooks/jotai/globals-wrapper';
import { ExtensionsState } from 'function/global/types';

import './extension-manager.css';

function ExtensionElement(props: {
  ext: Extension;
  active: boolean;
  movability: { up: boolean; down: boolean };
  buttonText: string;
  clickCallback: (event: unknown) => void;
  moveCallback: (event: { name: string; type: 'up' | 'down' }) => void;
  revDeps: string[];
}) {
  const {
    ext,
    active,
    movability,
    buttonText,
    clickCallback,
    moveCallback,
    revDeps,
  } = props;
  const {
    name,
    version,
    author,
    'display-name': displayName,
    description,
  } = ext.definition;

  const [t] = useTranslation(['gui-editor']);

  const renderTooltip = (p: unknown) => {
    if (revDeps.length > 0) {
      return (
        // eslint-disable-next-line react/jsx-props-no-spreading
        <Tooltip {...(p as object)}>
          {revDeps.length > 0
            ? t('gui-editor:extensions.is.dependency', {
                dependencies: revDeps.join(', '),
              })
            : ''}
        </Tooltip>
      );
    }
    // eslint-disable-next-line react/jsx-no-useless-fragment
    return <></>;
  };

  const arrows = active ? (
    <Col className="col-auto arrow-margin">
      <Row className="flex-column">
        <Button
          className="arrow-container"
          disabled={!movability.up}
          onClick={() => {
            if (movability.up) moveCallback({ name: ext.name, type: 'up' });
          }}
        >
          <div className="arrow up" />
        </Button>
        <Button
          className="arrow-container"
          disabled={!movability.down}
          onClick={() => {
            if (movability.down) moveCallback({ name: ext.name, type: 'down' });
          }}
        >
          <div className="arrow down" />
        </Button>
      </Row>
    </Col>
  ) : (
    // eslint-disable-next-line react/jsx-no-useless-fragment
    <></>
  );

  const enablearrow = !active ? (
    <Col className="col-auto">
      <OverlayTrigger placement="left" overlay={renderTooltip}>
        <div>
          <Button
            className="fs-8 enable-arrow "
            onClick={clickCallback}
            disabled={revDeps.length > 0}
          />
        </div>
      </OverlayTrigger>
    </Col>
  ) : (
    // eslint-disable-next-line react/jsx-no-useless-fragment
    <></>
  );

  const disablearrow = active ? (
    <Col className="col-auto">
      <OverlayTrigger placement="left" overlay={renderTooltip}>
        <div>
          <Button
            className="fs-8 disable-arrow "
            onClick={clickCallback}
            disabled={revDeps.length > 0}
          />
        </div>
      </OverlayTrigger>
    </Col>
  ) : (
    // eslint-disable-next-line react/jsx-no-useless-fragment
    <></>
  );

  // my-auto is also possible instead of align-items-center
  return (
    <ListGroup.Item
      key={`${name}-${version}-${author}`}
      className="light-shade-item"
    >
      <Row className="align-items-center">
        {disablearrow}
        <Col>
          <Row>
            {/* <Col className="col-2">
              <span className="mx-2">{displayName || name}</span>
            </Col> */}
            <Col className="col-12">
              <span className="mx-2 text-secondary">-</span>
              <span className="mx-2" style={{ fontSize: 'smaller' }}>
                {name}-{version}
              </span>
            </Col>
            {/* <Col>
              <span className="mx-2">{description || ''}</span>
             </Col> */}
          </Row>
        </Col>
        {arrows}
        {enablearrow}
      </Row>
    </ListGroup.Item>
  );
}

export default function ExtensionManager() {
  const extensions = useExtensions();
  const setActiveExtensions = useSetActiveExtensions();
  const [extensionsState, setExtensionsState] = useExtensionStateReducer();

  const [t] = useTranslation(['gui-general', 'gui-editor']);

  const eds = new ExtensionDependencySolver(extensions);
  const revDeps = Object.fromEntries(
    extensions.map((e: Extension) => [
      e.name,
      eds.reverseDependenciesFor(e.name),
    ])
  );
  const depsFor = Object.fromEntries(
    extensions.map((e: Extension) => [
      e.name,
      eds
        .dependenciesFor(e.name)
        .flat()
        .filter((s) => s !== e.name),
    ])
  );
  const extensionsByName = Object.fromEntries(
    extensions.map((ext: Extension) => [ext.name, ext])
  );
  const extensionsByNameVersionString = Object.fromEntries(
    extensions.map((ext: Extension) => [`${ext.name}-${ext.version}`, ext])
  );

  const eUI = extensionsState.installedExtensions.map((ext) => (
    <ExtensionElement
      key={`${ext.name}-${ext.version}`}
      ext={ext}
      active={false}
      movability={{ up: false, down: false }}
      buttonText={t('gui-general:activate')}
      clickCallback={(event) => {
        // TODO: include a check where it checks whether the right version of an extension is available and selected (version dropdown box)

        const dependencyExtensionNames = eds.dependenciesFor(ext.name).flat();

        const dependencies: Extension[] = dependencyExtensionNames
          .filter(
            (v: string) =>
              extensionsState.activeExtensions
                .map((e: Extension) => e.name)
                .indexOf(v) === -1
          )
          .map((v: string) => {
            if (extensionsByName[v] !== undefined) {
              return extensionsByName[v];
            }
            throw new Error();
          }) //           .filter((e: Extension) => dependencyExtensionNames.indexOf(e.name) !== -1)
          .reverse();

        const remainder = extensionsState.activeExtensions
          .flat()
          .map((e: Extension) => `${e.name}-${e.version}`)
          .filter(
            (es) =>
              dependencies
                .map((e: Extension) => `${e.name}-${e.version}`)
                .indexOf(es) === -1
          )
          .map((es: string) => extensionsByNameVersionString[es]);

        const final = [...dependencies, ...remainder];

        const localEDS = new ExtensionDependencySolver(final);
        console.log(localEDS.solve());
        const order = localEDS
          .solve()
          .reverse()
          .map((a: string[]) => a.map((v: string) => extensionsByName[v]));

        setExtensionsState({
          allExtensions: extensionsState.allExtensions,
          activatedExtensions: [...extensionsState.activatedExtensions, ext],
          activeExtensions: final,
          installedExtensions: extensionsState.installedExtensions.filter(
            (e: Extension) =>
              final
                .map((ex: Extension) => `${ex.name}-${ex.version}`)
                .indexOf(`${e.name}-${e.version}`) === -1
          ),
        });
        setActiveExtensions(final);
      }}
      moveCallback={(event: { type: 'up' | 'down' }) => {}}
      revDeps={revDeps[ext.name].filter(
        (e: string) =>
          extensionsState.activeExtensions
            .flat()
            .map((ex: Extension) => ex.name)
            .indexOf(e) !== -1
      )}
    />
  ));

  const activated = extensionsState.activeExtensions.map((ext, index, arr) => {
    const movability = {
      up: index > 0 && revDeps[ext.name].indexOf(arr[index - 1].name) === -1,
      down:
        index < arr.length - 1 &&
        depsFor[ext.name].indexOf(arr[index + 1].name) === -1,
    };
    return (
      <ExtensionElement
        key={`${ext.name}-${ext.version}`}
        ext={ext}
        active
        movability={movability}
        buttonText={t('gui-general:deactivate')}
        clickCallback={(event) => {
          const relevantExtensions = new Set(
            extensionsState.activatedExtensions
              .filter(
                (e) => `${e.name}-${e.version}` !== `${ext.name}-${ext.version}`
              )
              .map((e: Extension) => eds.dependenciesFor(e.name).flat())
              .flat()
          );

          // extensionsState.activeExtensions.filter((e: Extension) => relevantExtensions.has(e));
          const ae = extensionsState.activeExtensions.filter((e) =>
            relevantExtensions.has(e.name)
          );
          setExtensionsState({
            allExtensions: extensionsState.allExtensions,
            activatedExtensions: extensionsState.activatedExtensions.filter(
              (e) => `${e.name}-${e.version}` !== `${ext.name}-${ext.version}`
            ),
            activeExtensions: ae,
            installedExtensions: extensions
              .filter((e: Extension) => !relevantExtensions.has(e.name))
              .sort((a: Extension, b: Extension) =>
                a.name.localeCompare(b.name)
              ),
          } as unknown as ExtensionsState);
          setActiveExtensions(ae);
        }}
        moveCallback={(event: { name: string; type: 'up' | 'down' }) => {
          const { name, type } = event;
          const aei = extensionsState.activeExtensions
            .map((e) => e.name)
            .indexOf(name);
          const element = extensionsState.activeExtensions[aei];
          let newIndex = type === 'up' ? aei - 1 : aei + 1;
          newIndex = newIndex < 0 ? 0 : newIndex;
          newIndex =
            newIndex > extensionsState.activeExtensions.length - 1
              ? extensionsState.activeExtensions.length - 1
              : newIndex;
          extensionsState.activeExtensions.splice(aei, 1);
          extensionsState.activeExtensions.splice(newIndex, 0, element);
          setExtensionsState({
            activeExtensions: extensionsState.activeExtensions,
          } as unknown as ExtensionsState);
          setActiveExtensions(extensionsState.activeExtensions);
        }}
        revDeps={revDeps[ext.name].filter(
          (e: string) =>
            extensionsState.activeExtensions
              .map((ex: Extension) => ex.name)
              .indexOf(e) !== -1
        )}
      />
    );
  });

  return (
    <Container className="fs-6 h-100 vertical-container">
      <div className="row h-100">
        <div className="col-md-4 float-leftpt-2 w-50 h-100 d-flex flex-column overflow-hidden">
          <div>
            <h4>{t('gui-editor:extensions.available')}</h4>
          </div>
          <div className="parchment-box-inside flex-grow-1 parchment-box d-flex flex-column overflow-auto">
            <div className="parchment-box-item-list"> {eUI} </div>
          </div>
        </div>
        <div className="col-md-4 float-leftpt-2 w-50 h-100 d-flex flex-column overflow-hidden">
          <div>
            <h4>{t('gui-editor:extensions.activated')}</h4>
          </div>
          <div className="flex-grow-1 parchment-box-inside parchment-box d-flex flex-column overflow-auto">
            <div className="parchment-box-item-list">{activated}</div>
          </div>
        </div>
      </div>
    </Container>
  );
}
