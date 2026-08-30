import { AiPromptBuilder } from './ai-prompt.builder';

describe('AiPromptBuilder', () => {
  let builder: AiPromptBuilder;

  beforeEach(() => {
    builder = new AiPromptBuilder();
  });

  describe('buildLiveSystemPrompt', () => {
    it('should build a personalized live streaming prompt without JSON schema rules', () => {
      const user = {
        preferredName: 'Omar',
        age: 6,
        gender: 'boy',
      };

      const prompt = builder.buildLiveSystemPrompt(user, 'Toddy');

      expect(prompt).toContain("'Toddy'");
      expect(prompt).toContain("'Omar'");
      expect(prompt).toContain('6 years old');
      expect(prompt).toContain('boy');
      expect(prompt).toContain('setAlarm');
      expect(prompt).toContain('disableAlarm');
      expect(prompt).toContain('clearAllAlarms');
      expect(prompt).toContain('sendMessage');
      // Live prompt should NOT have JSON output constraints
      expect(prompt).not.toContain('IMPORTANT INSTRUCTION FOR JSON OUTPUT');
      expect(prompt).not.toContain('```json');
    });

    it('should handle default child values when user is not provided', () => {
      const prompt = builder.buildLiveSystemPrompt(null, null);

      expect(prompt).toContain("'Toddy'");
      expect(prompt).toContain("'Child'");
      expect(prompt).toContain('child');
    });
  });

  describe('getCurrentDatetimeText', () => {
    it('should include year, weekday, and time', () => {
      const text = builder.getCurrentDatetimeText();
      const currentYear = new Date().getFullYear();

      expect(text).toContain(String(currentYear));
      expect(text).toContain('Current date and time context:');
    });
  });
});
