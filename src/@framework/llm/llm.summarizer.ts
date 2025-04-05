import { OpenAI } from "@langchain/openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
//const webSearch = new SerpAPI(process.env.SERPAPI_API_KEY);
import { PromptTemplate } from "@langchain/core/prompts";


export class LLMSummarizer {
	// Define the properties and methods for the LLM summarizer
	private apiKey: string;
	private model: string;

	constructor(apiKey: string, model: string) {
		this.apiKey = apiKey;
		this.model = model;
	}

	async summarize(text: string): Promise<string> {
		// Implement the summarization logic here
		return "Summary of the text";
	}
}




// Prompt Template
const prompt = new PromptTemplate({
									  template: `
  Conversation so far:
  {summary}

  New incoming email:
  {email}

  Web search results:
  {search_results}

  Write a concise, helpful reply:`,
									  inputVariables: ["summary", "email", "search_results"],
								  });
