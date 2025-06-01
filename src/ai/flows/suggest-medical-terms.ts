// src/ai/flows/suggest-medical-terms.ts
'use server';

/**
 * @fileOverview AI-powered medical term suggestion flow for practitioners.
 *
 * - suggestMedicalTerms - Function to suggest medical terms based on input.
 * - SuggestMedicalTermsInput - Input type for the suggestMedicalTerms function.
 * - SuggestMedicalTermsOutput - Output type for the suggestMedicalTerms function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestMedicalTermsInputSchema = z.object({
  partialTerm: z
    .string()
    .describe('The partial medical term entered by the practitioner.'),
});
export type SuggestMedicalTermsInput = z.infer<typeof SuggestMedicalTermsInputSchema>;

const SuggestMedicalTermsOutputSchema = z.object({
  suggestions: z
    .array(z.string())
    .describe('An array of suggested medical terms based on the input.'),
});
export type SuggestMedicalTermsOutput = z.infer<typeof SuggestMedicalTermsOutputSchema>;

export async function suggestMedicalTerms(input: SuggestMedicalTermsInput): Promise<SuggestMedicalTermsOutput> {
  return suggestMedicalTermsFlow(input);
}

const suggestMedicalTermsPrompt = ai.definePrompt({
  name: 'suggestMedicalTermsPrompt',
  input: {schema: SuggestMedicalTermsInputSchema},
  output: {schema: SuggestMedicalTermsOutputSchema},
  prompt: `You are a medical terminology suggestion tool. Given a partial medical term, provide an array of likely full medical terms (diagnoses, medications, etc.).

Partial Term: {{{partialTerm}}}

Suggestions (as a JSON array of strings):`,
});

const suggestMedicalTermsFlow = ai.defineFlow(
  {
    name: 'suggestMedicalTermsFlow',
    inputSchema: SuggestMedicalTermsInputSchema,
    outputSchema: SuggestMedicalTermsOutputSchema,
  },
  async input => {
    const {output} = await suggestMedicalTermsPrompt(input);
    return output!;
  }
);
