'use server';
/**
 * @fileOverview This file defines a Genkit flow for smart order assignment to delivery partners.
 *
 * - assignOrder - Assigns an order to the most suitable delivery partner based on location, load, and area.
 * - AssignOrderInput - The input type for the assignOrder function.
 * - AssignOrderOutput - The return type for the assignOrder function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AssignOrderInputSchema = z.object({
  orderId: z.string().describe('The ID of the order to be assigned.'),
  orderLocation: z.string().describe('The current location of the order.'),
  partnerList: z
    .array(z.object({
      partnerId: z.string(),
      location: z.string(),
      currentLoad: z.number(),
      assignedAreas: z.array(z.string()),
      isAvailable: z.boolean().describe('Whether the partner is available for delivery.'),
    }))
    .describe('A list of available delivery partners with their details.'),
});
export type AssignOrderInput = z.infer<typeof AssignOrderInputSchema>;

const AssignOrderOutputSchema = z.object({
  assignedPartnerId: z.string().describe('The ID of the partner to whom the order is assigned.'),
  reason: z.string().describe('The reason for assigning the order to the selected partner.'),
});
export type AssignOrderOutput = z.infer<typeof AssignOrderOutputSchema>;

export async function assignOrder(input: AssignOrderInput): Promise<AssignOrderOutput> {
  return assignOrderFlow(input);
}

const assignOrderPrompt = ai.definePrompt({
  name: 'assignOrderPrompt',
  input: {schema: AssignOrderInputSchema},
  output: {schema: AssignOrderOutputSchema},
  prompt: `You are an expert delivery dispatcher. Given an order and a list of available delivery partners, determine the best partner to assign the order to.

Consider the partner's location, current load, assigned areas, and availability. Select the partner that minimizes delivery time and optimizes partner utilization.

Order ID: {{{orderId}}}
Order Location: {{{orderLocation}}}

Available Partners:
{{#each partnerList}}
- Partner ID: {{{partnerId}}}, Location: {{{location}}}, Load: {{{currentLoad}}}, Areas: {{#each assignedAreas}}{{{this}}} {{/each}}, Available: {{isAvailable}}
{{/each}}

Based on the above information, which partner is the most suitable to assign the order to? Explain your reasoning. Return the partner ID and reason for the assignment in JSON format.`,
});

const assignOrderFlow = ai.defineFlow(
  {
    name: 'assignOrderFlow',
    inputSchema: AssignOrderInputSchema,
    outputSchema: AssignOrderOutputSchema,
  },
  async input => {
    const {output} = await assignOrderPrompt(input);
    return output!;
  }
);
