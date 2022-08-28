export const CREATE_REPL = `
	mutation CreateRepl($input: CreateReplInput!) {
	  createRepl(input: $input) {
	    ...on Repl { id, url  }
	    ...on UserError { message }
	  }
	}`;
