import { ConversationChain } from "langchain/chains";
import { BufferMemory }      from "langchain/memory";
import { ChatOpenAI }        from "@langchain/openai";
import { OpenAIEmbeddings }  from "@langchain/openai";

const embeddings = new OpenAIEmbeddings({ openAIApiKey: process.env.OPENAI_API_KEY });
const llm = new ChatOpenAI({ openAIApiKey: process.env.OPENAI_API_KEY, model: 'gpt-4' });
const memory = new BufferMemory();
const chain = new ConversationChain({ llm, memory });

chain.call({ input: `Hello, I have just this year 2067 won the presidential election in the US,
I have just gotten installed and I find Hillary Clintons Head preserved in a jar, and it is still alive, she
commands be what to do and it is b?` })
