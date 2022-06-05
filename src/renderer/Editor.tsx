import './Editor.css';

const currentFolder = global.location.search.substring(
  global.location.search.indexOf('?editor=') + '?editor'.length + 1
);

type DisplayConfigElement = {
  name: string;
  type: string;
  children: DisplayConfigElement[];
};

const dummyYaml = Object.values(window.electron.ucpBackEnd.getYamlDefinition());

function CreateUIElement(args: { [spec: string]: DisplayConfigElement }) {
  const { spec } = args;
  if (spec.type === 'GroupBox') {
    const ch = spec.children.map((x, i) => {
      return <CreateUIElement spec={x} />;
    });

    return (
      <div className="input-group mb-3">
        <div className="input-group-prepend">
          <div className="input-group-text">{ch}</div>
        </div>
      </div>
    );
  }
  if (spec.type === 'RadioButton') {
    return <input type="radio" />;
  }
  return <div />;
}

const EditorTemplate = () => {
  return (
    <div className="col-9 mb-5">
      <div>Current folder: {currentFolder}</div>
      <div>
        {dummyYaml.map((x: DisplayConfigElement, i: number) => {
          return <CreateUIElement spec={x} />;
        })}
      </div>
    </div>
  );
};

export default function Editor() {
  return <EditorTemplate />;
}
