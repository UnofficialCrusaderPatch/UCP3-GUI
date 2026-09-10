import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'jotai';
import { Range } from 'semver';
import { mockIPC, mockWindows } from '@tauri-apps/api/mocks';
import en from '../resources/lang/sources/en.yaml?raw';
import de from '../resources/lang/sources/de.yaml?raw';
import '../src/components/variables.css';
import '../src/components/base.css';
import '../src/components/window.css';
import '../src/components/credits/credits.css';
import '../src/components/overlay/overlay.css';
const params = new URLSearchParams(location.search);
const lang = params.get('lang') || 'en';
const count = Number(params.get('count') || '3');
mockWindows('main');
mockIPC((cmd,args) => {
 const m=args?.message || {};
 if (m.cmd==='join') return m.paths.join('/');
 if (m.cmd==='resolvePath') return m.path || '/';
 if (m.cmd==='readTextFile') return m.path.endsWith('de.yaml') ? de : en;
 if (m.cmd==='listen') return 1;
 return null;
});
const { ExtensionViewer } = await import('../src/components/ucp-tabs/extension-manager/extension-viewer/extension-viewer');
const { ExtensionDependencyTree } = await import('../src/function/extensions/dependency-management/dependency-resolution');
const { EXTENSION_STATE_INTERNAL_ATOM } = await import('../src/function/extensions/state/state');
const { LANGUAGE_ATOM } = await import('../src/function/gui-settings/settings');
const { getStore } = await import('../src/hooks/jotai/base');
const { Overlay,setOverlayContent } = await import('../src/components/overlay/overlay');
const store=getStore();
store.set(LANGUAGE_ATOM,lang);
const ext=(name,display,dep={})=>({name,version:'1.0.0',definition:{name,version:'1.0.0','display-name':display,dependencies:dep},io:{fetchDescription:async()=> '# AI resource loader\n\nLoads the AI files selected by your extension packs.\n\n## Configuration\n\nChoose a pack in the Extensions tab, then review its settings before starting the game.\n\nThis is fixture text for checking the actual extension viewer layout.'}});
const library=ext('aicloader','AI resource loader');
const deps=Array.from({length:count},(_,i)=>ext('pack-'+i,params.has('long')?'AnExtremelyLongUnbrokenExtensionNameWithNoSpaces'.repeat(3):'Community AI pack '+(i+1),{aicloader:new Range('^1.0.0')}));
const core=ext('resource-core','Resource core',{framework:new Range('>=3.0.0')});
library.definition.dependencies = params.has('empty') ? {} : {'resource-core':new Range('^1.0.0')};
const campaign=ext('campaign','Campaign preset',{'pack-0':new Range('^1.0.0')});
const entries=[core,library,...deps,...(count ? [campaign] : [])];
const tree=new ExtensionDependencyTree(entries);
tree.tryResolveAllDependencies();
store.set(EXTENSION_STATE_INTERNAL_ATOM,{extensions:entries,activeExtensions:entries,tree});
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Provider,{store},React.createElement(React.Suspense,{fallback:'Loading'},React.createElement('div',{style:{height:'30px',background:'#292722',color:'white'}},'UI review fixture — actual component and styles; mocked host I/O'),React.createElement('div',{className:'page-main',style:{background:'#554c39'}},React.createElement(Overlay)))));
setOverlayContent(ExtensionViewer,true,true,{extension:library});
window.review={store,tree,library,deps};

if (params.has('expanded')) {
  const observer = new MutationObserver(() => {
    const disclosure = document.querySelector('.extension-relations');
    if (disclosure) {
      disclosure.open = true;
      observer.disconnect();
    }
  });
  observer.observe(document.getElementById('root'), { childList: true, subtree: true });
}
