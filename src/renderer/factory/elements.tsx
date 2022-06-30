import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';

import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import ToggleButton from 'react-bootstrap/ToggleButton';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';

import { Form } from 'react-bootstrap';

export type DisplayConfigElement = {
  name: string;
  description: string;
  header: string;
  text: string;
  type: string;
  children: DisplayConfigElement[];
  default: unknown;
  url: string;
  columns: number;
};

export type NumberInputDisplayConfigElement = DisplayConfigElement & {
  min: number;
  max: number;
};

const UIFactory = {
  CreateGroupBox(
    spec: DisplayConfigElement,
    configuration: { [key: string]: unknown },
    setConfiguration: (args: { key: string; value: unknown }) => void
  ) {
    const { name, description, children, columns, header } = spec;
    const itemCount = children.length;
    const rows = Math.ceil(itemCount / columns);

    const cs = [];

    for (let row = 0; row < rows; row += 1) {
      const rowChildren = [];
      for (
        let i = columns * row;
        i < Math.min(columns * (row + 1), children.length);
        i += 1
      ) {
        rowChildren.push(
          <Col>
            <UIFactory.CreateUIElement
              spec={children[i]}
              configuration={configuration}
              setConfiguration={setConfiguration}
            />
          </Col>
        );
      }
      cs.push(<Row className="my-1">{rowChildren}</Row>);
    }

    return (
      <Form key={`${name}-groupbox`}>
        <Container className="border-bottom border-light my-2">
          <Row className="my-3">
            <h5>{header}</h5>
            <div>
              <span>{description}</span>
            </div>
          </Row>
          <Row className="mt-1 pt-2">{cs}</Row>
          <Row>
            <span className="text-muted text-end">module-name-v1.0.0</span>
          </Row>
        </Container>
      </Form>
    );
  },

  CreateSwitch(
    spec: DisplayConfigElement,
    configuration: { [url: string]: unknown },
    setConfiguration: (args: { key: string; value: unknown }) => void
  ) {
    const { url, text } = spec;
    const { [url]: value } = configuration;
    return (
      <Form.Switch
        className="my-3"
        key={`${url}-switch`}
        label={text}
        id={`${url}-switch`}
        checked={value === undefined ? false : (value as boolean)}
        onChange={(event) => {
          setConfiguration({ key: url, value: event.target.checked });
        }}
      />
    );
  },

  CreateNumberInputElement(
    spec: DisplayConfigElement,
    configuration: { [url: string]: unknown },
    setConfiguration: (args: { key: string; value: unknown }) => void
  ) {
    const { url, text, min, max } = spec as NumberInputDisplayConfigElement;
    const { [url]: value } = configuration;
    return (
      <Form.Group className="d-flex align-items-center">
        <div className="col-1 mr-3">
          <Form.Control
            key={`${url}-input`}
            type="number"
            min={min as number}
            max={max as number}
            id={`${url}-input`}
            value={value === undefined ? 0 : (value as number)}
            onChange={(event) => {
              setConfiguration({
                key: url,
                value: parseInt(event.target.value, 10),
              });
            }}
          />
        </div>
        <div className="flex-grow-1 px-2">
          <Form.Label>{text}</Form.Label>
        </div>
      </Form.Group>
    );
  },

  CreateUIElement(args: {
    spec: DisplayConfigElement;
    configuration: { [key: string]: unknown };
    setConfiguration: (args: { key: string; value: unknown }) => void;
  }) {
    const { spec, configuration, setConfiguration } = args;
    if (spec.type === 'GroupBox') {
      return UIFactory.CreateGroupBox(spec, configuration, setConfiguration);
    }
    if (spec.type === 'Switch') {
      return UIFactory.CreateSwitch(spec, configuration, setConfiguration);
    }
    if (spec.type === 'Number') {
      return UIFactory.CreateNumberInputElement(
        spec,
        configuration,
        setConfiguration
      );
    }
    return <div />;
  },

  // CreateSections(args: {
  //   definition: { [key: string]: unknown };
  //   configuration: { [key: string]: unknown };
  //   setConfiguration: (args: { key: string; value: unknown }) => void;
  // }) {
  //   const { definition, configuration, setConfiguration } = args;
  //   const content = Object.keys(definition).map((level1Section) => {
  //     console.log(definition[level1Section]);
  //     const level2sections = Object.keys(definition[level1Section]).map(
  //       (level2Section) => {
  //         const level3sections = Object.keys(
  //           definition[level1Section][level2Section]
  //         ).map((level3Section) => {
  //           console.log(level1Section, level2Section, level3Section);
  //           console.log(definition[level1Section][level2Section][level3Section]);
  //           const elements = definition[level1Section][level2Section][
  //             level3Section
  //           ].elements.map((e) => {
  //             return (
  //               <UIFactory.CreateUIElement
  //                 spec={e}
  //                 configuration={configuration}
  //                 setConfiguration={setConfiguration}
  //               />
  //             );
  //           });
  //           return (
  //             <div>
  //               <h3>{level3Section}</h3>
  //               {elements}
  //             </div>
  //           );
  //         });
  //         return (
  //           <div>
  //             <h2>{level2Section}</h2>
  //             {level3sections}
  //           </div>
  //         );
  //       }
  //     );
  //     return (
  //       <div>
  //         <h1>{level1Section}</h1>
  //         {level2sections}
  //       </div>
  //     );
  //   });
  //   return <div>{content}</div>;
  // },
};

export { UIFactory };
