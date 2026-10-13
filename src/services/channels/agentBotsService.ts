import api from '@/services/core/api';
import { AgentBot } from '@/components/channels/settings/helpers/agentBotHelpers';
import type {
  AgentBotsResponse,
  AgentBotResponse,
  ChannelAccessTokenResponse,
  AgentBotInboxConfiguration,
  AgentBotInboxBinding,
  AgentBotInboxStatus,
} from '@/types/channels/inbox';

const AgentBotsService = {
  // Get all agent bots
  async getAll(params?: { per_page?: number }): Promise<AgentBot[]> {
    try {
      const { data } = await api.get<AgentBotsResponse>(`/agent_bots`, { params });

      let result = data.data || data;
      if (!Array.isArray(result)) {
        result = [];
      }

      return result;
    } catch (error) {
      console.error('AgentBotsService.getAll error:', error);
      return [];
    }
  },

  // Get single agent bot
  async getById(botId: string): Promise<AgentBot | null> {
    try {
      const { data } = await api.get<AgentBotResponse>(`/agent_bots/${botId}`);

      return data.data || data;
    } catch (error) {
      console.error('AgentBotsService.getById error:', error);
      return null;
    }
  },

  // Create new agent bot
  async create(formData: FormData): Promise<(AgentBot & { access_token?: string }) | null> {
    try {
      const { data } = await api.post<AgentBotResponse & ChannelAccessTokenResponse>(
        `/agent_bots`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );

      return data.data || data;
    } catch (error) {
      console.error('AgentBotsService.create error:', error);
      throw error;
    }
  },

  // Update agent bot
  async update(botId: string, formData: FormData): Promise<AgentBot | null> {
    try {
      const { data } = await api.patch<AgentBotResponse>(`/agent_bots/${botId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return data.data || data;
    } catch (error) {
      console.error('AgentBotsService.update error:', error);
      throw error;
    }
  },

  // Delete agent bot
  async delete(botId: string): Promise<boolean> {
    try {
      await api.delete(`/agent_bots/${botId}`);
      return true;
    } catch (error) {
      console.error('AgentBotsService.delete error:', error);
      throw error;
    }
  },

  // Delete agent bot avatar
  async deleteAvatar(botId: string): Promise<boolean> {
    try {
      await api.delete(`/agent_bots/${botId}/avatar`);
      return true;
    } catch (error) {
      console.error('AgentBotsService.deleteAvatar error:', error);
      throw error;
    }
  },

  // Reset access token
  async resetAccessToken(botId: string): Promise<string | null> {
    try {
      const { data } = await api.post<ChannelAccessTokenResponse>(
        `/agent_bots/${botId}/reset_access_token`,
      );

      return data.access_token;
    } catch (error) {
      console.error('AgentBotsService.resetAccessToken error:', error);
      throw error;
    }
  },

  // Channels bound to an agent bot, active and inactive
  async listBotInboxes(botId: string): Promise<AgentBotInboxBinding[]> {
    const { data } = await api.get<{ data: AgentBotInboxBinding[] }>(
      `/agent_bots/${botId}/inboxes`,
    );
    return Array.isArray(data?.data) ? data.data : [];
  },

  // Binds the inbox to `botId` on the backend defaults. `expectedBotId` is the agent
  // the caller saw on the channel (null = none): the backend answers 409 if the
  // channel has meanwhile changed hands, so a transfer never goes unconfirmed.
  async linkInboxBot(inboxId: string, botId: string, expectedBotId: string | null): Promise<void> {
    await api.post(`/inboxes/${inboxId}/set_agent_bot`, {
      agent_bot: botId,
      expected_agent_bot_id: expectedBotId,
    });
  },

  // Edits the inbox's binding in place: unlinking is `status: 'inactive'`, which
  // keeps the configuration for a later reactivation. `botId` makes the backend
  // answer 409 if the channel has meanwhile moved to another agent.
  async updateInboxBinding(
    inboxId: string,
    botId: string,
    changes: { status?: AgentBotInboxStatus; configuration?: AgentBotInboxConfiguration },
  ): Promise<AgentBotInboxBinding> {
    const { data } = await api.patch<{ data: AgentBotInboxBinding }>(
      `/inboxes/${inboxId}/agent_bot_inbox`,
      {
        agent_bot_id: botId,
        ...(changes.status ? { status: changes.status } : {}),
        ...(changes.configuration ? { agent_bot_config: changes.configuration } : {}),
      },
    );
    return data.data;
  },
};

export default AgentBotsService;
