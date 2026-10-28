import { MobileDrawer } from '@components/app/mobile/MobileDrawer';
import MagnifyingGlass from '@icon/system/regular/magnifying-glass.svg';
import Plus from '@icon/system/regular/plus.svg';
import { Button } from '@ui';
import { createSignal, For, Show } from 'solid-js';
import { AgentIcon } from '../components/AgentGlyph';
import { AgentPickerIdentity } from '../components/AgentPickerIdentity';
import { agentPickerGroups } from '../core/agent-picker-groups';
import type { RosterAgent } from '../core/roster';
import type { AgentPickerProps } from './AgentPicker';

/** A bottom sheet of agents; the composer's model control sits beside its trigger. */
export function MobileAgentPicker(props: AgentPickerProps) {
  const [open, setOpen] = createSignal(false);
  const [query, setQuery] = createSignal('');
  const matches = (text: string) =>
    text.toLocaleLowerCase().includes(query().trim().toLocaleLowerCase());
  const groups = () =>
    agentPickerGroups(
      props.agents.filter((agent) =>
        matches(`${agent.name} ${agent.runtime.label}`)
      )
    );
  const changeOpen = (next: boolean) => {
    setOpen(next);
    if (!next) setQuery('');
  };
  const choose = (agent: RosterAgent) => {
    changeOpen(false);
    if (agent.unavailableReason) props.onConnect(agent);
    else props.onSelect(agent);
  };
  return (
    <MobileDrawer
      side="bottom"
      open={open()}
      onOpenChange={changeOpen}
      restoreFocus={!!props.onCloseAutoFocus}
      onFinalFocus={props.onCloseAutoFocus}
    >
      <MobileDrawer.Trigger
        as={Button}
        variant="ghost"
        size="sm"
        aria-label="Agent"
        title={props.selected?.name ?? 'Choose agent'}
        class={
          props.showModelLabel
            ? 'h-[34px] max-w-full min-w-0 gap-1.5 rounded-full px-2 text-ink-muted'
            : 'size-[34px] shrink-0 rounded-full p-0 text-ink-muted'
        }
        // Let click open the sheet before any native focus can move the trigger.
        // Physical iOS devices also send mousedown after a cancelled pointerdown.
        onPointerDown={(event: PointerEvent) => event.preventDefault()}
        onMouseDown={(event: MouseEvent) => event.preventDefault()}
      >
        {/* Icon only on a phone; the title and the sheet name the choice. */}
        <Show when={props.selected}>
          {(agent) => <AgentIcon agent={agent()} class="size-[18px]" />}
        </Show>
        <Show when={props.showModelLabel}>
          <span class="min-w-0 truncate">
            {props.selected?.name ?? 'Choose agent'}
          </span>
        </Show>
      </MobileDrawer.Trigger>
      <MobileDrawer.Portal>
        <MobileDrawer.Overlay />
        <MobileDrawer.Content aria-label="Choose an agent">
          <MobileDrawer.Handle />
          <div class="flex items-center gap-2 px-4 pb-3">
            <h2 class="min-w-0 flex-1 truncate font-medium">Choose an agent</h2>
          </div>
          <div class="mx-4 mb-2 flex h-9 shrink-0 items-center gap-2 px-3">
            <MagnifyingGlass
              aria-hidden="true"
              class="size-4 shrink-0 text-ink-extra-muted"
            />
            <input
              aria-label="Search agents"
              placeholder="Search agents"
              value={query()}
              onInput={(event) => setQuery(event.currentTarget.value)}
              class="h-full min-w-0 w-full border-0 bg-transparent p-0 text-base outline-none placeholder:text-ink-extra-muted"
            />
          </div>
          <MobileDrawer.ScrollBody class="gap-1">
            <For each={groups()}>
              {(group) => (
                <div>
                  <MobileDrawer.Label class="px-4 pb-1 font-medium text-ink-muted">
                    {group.label}
                  </MobileDrawer.Label>
                  <MobileDrawer.Section
                    class="rounded-none bg-transparent p-0"
                    role="group"
                    aria-label={group.label}
                  >
                    <For each={group.agents}>
                      {(agent) => (
                        <MobileDrawer.Item
                          class="min-w-0"
                          disabled={Boolean(
                            agent.unavailableReason && !agent.connectLabel
                          )}
                          onClick={() => choose(agent)}
                        >
                          <AgentPickerIdentity
                            agent={agent}
                            selected={props.selected?.id === agent.id}
                            model={
                              props.selected?.id === agent.id
                                ? props.modelOverride
                                : undefined
                            }
                          />
                        </MobileDrawer.Item>
                      )}
                    </For>
                  </MobileDrawer.Section>
                </div>
              )}
            </For>
            <Show when={!props.loading && groups().length === 0}>
              <p role="status" class="px-4 py-3 text-sm text-ink-muted">
                {query() ? 'No matching agents' : 'No agents available'}
              </p>
            </Show>
            <Show when={props.loading}>
              <p role="status" class="px-4 py-3 text-sm text-ink-muted">
                Loading agents…
              </p>
            </Show>
            <div class="flex justify-end px-4 pt-1">
              <Button
                variant="strong"
                size="sm"
                glass={false}
                class="gap-1.5"
                onClick={() => {
                  changeOpen(false);
                  props.onCreate();
                }}
              >
                <Plus class="size-4" />
                Create agent
              </Button>
            </div>
          </MobileDrawer.ScrollBody>
        </MobileDrawer.Content>
      </MobileDrawer.Portal>
    </MobileDrawer>
  );
}
