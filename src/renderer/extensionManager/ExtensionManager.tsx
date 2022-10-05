import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';

import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import ToggleButton from 'react-bootstrap/ToggleButton';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import {
  Button,
  Col,
  Container,
  Form,
  ListGroup,
  Row,
  Tooltip,
} from 'react-bootstrap';
import { useReducer } from 'react';
import { Extension } from '../../common/config/common';
import ExtensionDependencySolver from '../../common/config/ExtensionDependencySolver';

import './ExtensionManager.css';

function renderExtension(
  ext: Extension,
  active: boolean,
  movability: { up: boolean; down: boolean },
  buttonText: string,
  clickCallback: (event: unknown) => void,
  moveCallback: (event: { name: string; type: 'up' | 'down' }) => void,
  revDeps: string[]
) {
  const { name, version, author } = ext.definition;

  const renderTooltip = (props: unknown) => {
    if (revDeps.length > 0) {
      return (
        // eslint-disable-next-line react/jsx-props-no-spreading
        <Tooltip {...(props as object)}>
          {revDeps.length > 0
            ? `Cannot deactivate this because this is a dependency of ${revDeps.join(
                ', '
              )}`
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
        className="col-auto arrow up mx-1"
        disabled={!movability.up}
        onClick={() => {
          if (movability.up) moveCallback({ name: ext.name, type: 'up' });
        }}
      />
      <Col
        className="col-auto arrow down mx-1"
        disabled={!movability.down}
        onClick={() => {
          if (movability.down) moveCallback({ name: ext.name, type: 'down' });
        }}
      />
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
            <Col className="col-3">
              <span className="mx-2">{name}</span>
            </Col>
            <Col>
              <span className="mx-2 text-secondary">-</span>
              <span className="mx-2" style={{ fontSize: 'smaller' }}>
                {version}
              </span>
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

  type State = {
    allExtensions: Extension[];
    // Explicitly activated
    activatedExtensions: Extension[];
    activeExtensions: Extension[];
    installedExtensions: Extension[];
    reverseDependencies: { [key: string]: string[] };
  };

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
  const revExtensions = Object.fromEntries(
    extensions.map((ext: Extension) => [ext.name, ext])
  );

  const [extensionsState, setExtensionsState] = useReducer(
    (oldState: State, newState: unknown): State => ({
      ...oldState,
      ...(newState as object),
    }),
    {
      allExtensions: [...extensions],
      activeExtensions: [],
      activatedExtensions: [],
      installedExtensions: [...extensions],
      reverseDependencies: revDeps,
    } as State
  );

  const eUI = extensionsState.installedExtensions.map((ext) =>
    renderExtension(
      ext,
      false,
      { up: false, down: false },
      'Activate',
      (event) => {
        // TODO: include a check where it checks whether the right version of an extension is available and selected (version dropdown box)

        const impliedExtensions = eds.dependenciesFor(ext.name).flat();

        const ies: Extension[] = impliedExtensions
          .map((v: string) => {
            if (revExtensions[v] !== undefined) {
              return revExtensions[v];
            }
            throw new Error();
          })
          .filter((e: Extension) => impliedExtensions.indexOf(e.name) !== -1)
          .reverse();

        const remainder = extensionsState.activeExtensions
          .flat()
          .filter((e: Extension) => ies.indexOf(e) === -1);

        const final = [...ies, ...remainder];

        const localEDS = new ExtensionDependencySolver(final);
        console.log(localEDS.solve());
        const order = localEDS
          .solve()
          .reverse()
          .map((a: string[]) => a.map((v: string) => revExtensions[v]));

        setExtensionsState({
          activatedExtensions: [...extensionsState.activatedExtensions, ext],
          activeExtensions: final,
          installedExtensions: extensionsState.installedExtensions.filter(
            (e: Extension) =>
              final
                .map((ex: Extension) => `${ex.name}-${ex.version}`)
                .indexOf(`${e.name}-${e.version}`) === -1
          ),
        });
      },
      (event: { type: 'up' | 'down' }) => {},
      extensionsState.reverseDependencies[ext.name].filter(
        (e: string) =>
          extensionsState.activeExtensions
            .flat()
            .map((ex: Extension) => ex.name)
            .indexOf(e) !== -1
      )
    )
  );

  const activated = extensionsState.activeExtensions.map((ext, index, arr) => {
    const movability = {
      up: index > 0 && revDeps[ext.name].indexOf(arr[index - 1].name) === -1,
      down:
        index < arr.length - 1 &&
        depsFor[ext.name].indexOf(arr[index + 1].name) === -1,
    };
    return renderExtension(
      ext,
      true,
      movability,
      'Deactivate',
      (event) => {
        const relevantExtensions = new Set(
          extensionsState.activatedExtensions
            .filter(
              (e) => `${e.name}-${e.version}` !== `${ext.name}-${ext.version}`
            )
            .map((e: Extension) => eds.dependenciesFor(e.name).flat())
            .flat()
        );

        // extensionsState.activeExtensions.filter((e: Extension) => relevantExtensions.has(e));

        setExtensionsState({
          activatedExtensions: extensionsState.activatedExtensions.filter(
            (e) => `${e.name}-${e.version}` !== `${ext.name}-${ext.version}`
          ),
          activeExtensions: extensionsState.activeExtensions.filter((e) =>
            relevantExtensions.has(e.name)
          ),
          installedExtensions: extensions
            .filter((e: Extension) => !relevantExtensions.has(e.name))
            .sort((a: Extension, b: Extension) => a.name.localeCompare(b.name)),
        } as unknown as State);
      },
      (event: { name: string; type: 'up' | 'down' }) => {
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
        });
      },
      extensionsState.reverseDependencies[ext.name].filter(
        (e: string) =>
          extensionsState.activeExtensions
            .map((ex: Extension) => ex.name)
            .indexOf(e) !== -1
      )
    );
  });

  return (
    <Container className="fs-6" style={{ height: '85vh' }}>
      <Row className="mb-3" style={{}}>
        <h4>Activated extensions</h4>
        <div
          style={{
            height: '40vh',
            overflowY: 'scroll',
            overflowX: 'clip',
            backgroundColor: 'var(--bs-gray-800)',
          }}
          className="border-secondary border"
        >
          {activated}
        </div>
      </Row>
      <Row style={{}}>
        <h4>Available extensions</h4>
        <div
          style={{
            height: '40vh',
            overflowY: 'scroll',
            overflowX: 'clip',
            backgroundColor: 'var(--bs-gray-800)',
          }}
          className="border-secondary border"
        >
          {eUI}
        </div>
      </Row>
    </Container>
  );
}
