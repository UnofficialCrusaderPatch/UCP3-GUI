import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import {
  Button,
  Col,
  Container,
  ListGroup,
  Row,
  Tooltip,
} from 'react-bootstrap';
import { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { Extension } from 'config/ucp/common';
import ExtensionDependencySolver from 'config/ucp/extension-dependency-solver';

import './extension-manager.css';
import { GlobalState, ExtensionsState } from 'function/global-state';

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
    <>
      <Col
        className="col-auto arrow-container"
        disabled={!movability.up}
        onClick={() => {
          if (movability.up) moveCallback({ name: ext.name, type: 'up' });
        }}
      >
        <div className="arrow up" />
      </Col>
      <Col
        className="col-auto arrow-container"
        disabled={!movability.down}
        onClick={() => {
          if (movability.down) moveCallback({ name: ext.name, type: 'down' });
        }}
      >
        <div className="arrow down" />
      </Col>
    </>
  ) : (
    // eslint-disable-next-line react/jsx-no-useless-fragment
    <></>
  );

  // my-auto is also possible instead of align-items-center
  return (
    <ListGroup.Item
      key={`${name}-${version}-${author}`}
      style={{ backgroundColor: 'var(--bs-gray-800)' }}
      className="text-light border-secondary container border-bottom p-1"
    >
      <Row className="align-items-center">
        {arrows}
        <Col>
          <Row>
            <Col className="col-2">
              <span className="mx-2">{displayName || name}</span>
            </Col>
            <Col className="col-3">
              <span className="mx-2 text-secondary">-</span>
              <span className="mx-2" style={{ fontSize: 'smaller' }}>
                {name}-{version}
              </span>
            </Col>
            <Col>
              <span className="mx-2">{description || ''}</span>
            </Col>
          </Row>
        </Col>
        <Col className="col-auto">
          <OverlayTrigger placement="left" overlay={renderTooltip}>
            <div>
              <Button
                className="fs-8"
                onClick={clickCallback}
                disabled={revDeps.length > 0}
              >
                {buttonText}
              </Button>
            </div>
          </OverlayTrigger>
        </Col>
      </Row>
    </ListGroup.Item>
  );
}

export default function ExtensionManager(args: { extensions: Extension[] }) {
  const { extensions } = args;
  const { setActiveExtensions, extensionsState, setExtensionsState } =
    useContext(GlobalState);

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
    <Container className="fs-6 h-100">
      <div className="pb-2 h-50 d-flex flex-column overflow-hidden">
        <h4>{t('gui-editor:extensions.activated')}</h4>
        <div
          style={{
            overflowY: 'scroll',
            overflowX: 'clip',
            backgroundColor: 'var(--bs-gray-800)',
          }}
          className="border-secondary border flex-grow-1"
        >
          {activated}
        </div>
      </div>
      <div className="pt-2 h-50 d-flex flex-column overflow-hidden">
        <h4>{t('gui-editor:extensions.available')}</h4>
        <div
          style={{
            overflowY: 'scroll',
            overflowX: 'clip',
            backgroundColor: 'var(--bs-gray-800)',
          }}
          className="border-secondary border flex-grow-1"
        >
          {eUI}
        </div>
      </div>
    </Container>
  );
}
