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

function renderExtension(
  ext: Extension,
  buttonText: string,
  clickCallback: (event: unknown) => void,
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
    return <></>;
  };

  // my-auto is also possible instead of align-items-center
  return (
    <ListGroup.Item
      key={`${name}-${version}-${author}`}
      style={{ backgroundColor: 'var(--bs-gray-800)' }}
      className="text-light border-light container border-bottom p-1"
    >
      <Row className="align-items-center">
        <Col>
          <Row>
            <Col className="col-3">
              <span className="mx-2">{name}</span>
              <span className="mx-2 text-secondary">-</span>
            </Col>
            <Col>
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

  const [extensionsState, setExtensionsState] = useReducer(
    (oldState: State, newState: unknown): State => {
      return { ...oldState, ...(newState as object) };
    },
    {
      allExtensions: [...extensions],
      activeExtensions: [],
      activatedExtensions: [],
      installedExtensions: [...extensions],
      reverseDependencies: revDeps,
    } as State
  );

  const eUI = extensionsState.installedExtensions.map((ext) => {
    return renderExtension(
      ext,
      'Activate',
      (event) => {
        // TODO: include a check where it checks whether the right version of an extension is available and selected (version dropdown box)

        const impliedExtensions = eds.dependenciesFor(ext.name).flat();

        const ies: Extension[] = impliedExtensions
          .map((v: string) => {
            const i = extensions.map((e) => e.name).indexOf(v);
            if (i !== -1) {
              return extensions[i];
            }
            throw new Error();
          })
          .filter((e: Extension) => impliedExtensions.indexOf(e.name) !== -1)
          .reverse();

        const remainder = extensionsState.activeExtensions.filter(
          (e: Extension) => ies.indexOf(e) === -1
        );

        const final = [...ies, ...remainder];

        // const activeAsDependencies = extensionsState.isDependency;
        // ies
        //   .filter((e: Extension) => e.name !== ext.name)
        //   .forEach((e: Extension) => {
        //     activeAsDependencies[e.name] = true;
        //   });

        setExtensionsState({
          activatedExtensions: [...extensionsState.activatedExtensions, ext],
          activeExtensions: final,
          installedExtensions: extensionsState.installedExtensions.filter(
            (e: Extension) => final.indexOf(e) === -1
          ),
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

  const activated = extensionsState.activeExtensions.map((ext) => {
    return renderExtension(
      ext,
      'Deactivate',
      (event) => {
        const relevantExtensions = new Set(
          extensionsState.activatedExtensions
            .filter((e) => e !== ext)
            .map((e: Extension) => eds.dependenciesFor(e.name).flat())
            .flat()
        );

        // extensionsState.activeExtensions.filter((e: Extension) => relevantExtensions.has(e));

        setExtensionsState({
          activatedExtensions: extensionsState.activatedExtensions.filter(
            (e) => e !== ext
          ),
          activeExtensions: extensionsState.activeExtensions.filter((e) =>
            relevantExtensions.has(e.name)
          ),
          installedExtensions: extensions
            .filter((e: Extension) => !relevantExtensions.has(e.name))
            .sort((a: Extension, b: Extension) => a.name.localeCompare(b.name)),
        } as unknown as State);
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
    <Container className="fs-6">
      <Row className="mb-3">
        <h4>Activated extensions</h4>
        {activated}
      </Row>
      <Row>
        <h4>Available extensions</h4>
        {eUI}
      </Row>
    </Container>
  );
}
