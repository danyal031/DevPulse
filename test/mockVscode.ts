export const workspace = {
  workspaceFolders: [
    {
      uri: { fsPath: process.cwd() },
      name: 'DevPulse',
      index: 0
    }
  ]
};

export const window = {
  createTerminal: (options: any) => ({
    show: () => {},
    sendText: (text: string) => {},
    dispose: () => {}
  }),
  onDidCloseTerminal: (listener: (t: any) => void) => ({
    dispose: () => {}
  }),
  showInformationMessage: async (msg: string) => {},
  showErrorMessage: async (msg: string) => {},
  showSaveDialog: async () => undefined,
  activeTextEditor: undefined
};

export const env = {
  clipboard: {
    writeText: async (text: string) => {}
  },
  openExternal: async (uri: any) => true
};

export const Uri = {
  file: (pathStr: string) => ({ fsPath: pathStr, scheme: 'file' }),
  parse: (uriStr: string) => ({ toString: () => uriStr })
};

export const Range = class {
  constructor(public start: any, public end: any) {}
};

export const Position = class {
  constructor(public line: number, public character: number) {}
};
