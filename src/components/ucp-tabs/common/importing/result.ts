import { StrategyResult } from './import-strategies/common';

export type StrategyReport = {
  name: string;
  result: StrategyResult;
};

export type StrategyResultReport = {
  reports: StrategyReport[];
  result?: StrategyResult;
};

export type FailImportButtonCallbackResult =
  | {
      status: 'fail';
      reason: 'strategy';
      report: StrategyResultReport;
      message: {
        title: string;
        shortDescription: string;
        report: string;
      };
    }
  | {
      status: 'fail';
      reason: 'file';
      report: string;
    };

type SuccessImportButtonCallbackResult = {
  status: 'success';
};

type AbortImportButtonCallbackResult = {
  status: 'aborted';
};

export type ImportButtonCallbackResult =
  | FailImportButtonCallbackResult
  | SuccessImportButtonCallbackResult
  | AbortImportButtonCallbackResult;

export function makeErrorReport(report: StrategyResultReport) {
  const base = `Importing config using strategies failed.`;
  const tried = `Tried strategies: ${report.reports.map((r) => r.name).join(', ')}`;
  const reports = report.reports
    .map((r) => {
      if (r.result.status === 'error') {
        const name = `Name: ${r.name}`;
        const status = `Status: ${r.result.status}`;
        const code = `Code: ${r.result.code}`;
        const messages = `Messages: ${r.result.messages.join('\n')}`;
        return [name, status, code, messages].join('\n');
      }
      const name = `Name: ${r.name}`;
      const status = `Status: ${r.result.status}`;
      return [name, status].join('\n');
    })
    .join('\n\n');
  return { title: base, shortDescription: tried, report: reports };
}