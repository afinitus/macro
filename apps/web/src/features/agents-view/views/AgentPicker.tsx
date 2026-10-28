import { modelLabel } from '@core/component/AI/constant/model-label';
import { isTouchDevice } from '@core/mobile/isTouchDevice';
import CaretDownIcon from '@icon/system/regular/caret-down.svg';
import PlusIcon from '@icon/system/regular/plus.svg';
import { buttonClasses, cn, Dropdown } from '@ui';
import { tourTarget } from '@ui/components/Tour';
import { createSignal, For, Show } from 'solid-js';
import { AgentModelMenuItem } from '../../block-agent/component/AgentModelMenuItem';
import type {
  EffortChoice,
  EffortSelection,
} from '../../block-agent/state/session-config';
import { AgentIcon } from '../components/AgentGlyph';
import { AgentPickerIdentity } from '../components/AgentPickerIdentity';
import { ModelSelector } from '../components/ModelSelector';
import { agentPickerGroups } from '../core/agent-picker-groups';
import type { RosterAgent } from '../core/roster';
import { createComposerModels } from '../queries/composer-models';
import { AGENTS_TOUR } from '../tour';
import { MobileAgentPicker } from './MobileAgentPicker';

/** The agent to run, then a model control that overrides its default for one send. */
export type AgentPickerProps = {
  agents: RosterAgent[];
  selected?: RosterAgent;
  modelOverride?: string;
  loading: boolean;
  triggerClass?: string;
  /** Configuration forms also show the agent and model names on mobile. */
  showModelLabel?: boolean;
  effortLabel?: string;
  effortSelection?: EffortSelection;
  /** An agent alone means its default model; `model` is the model control's override. */
  onSelect: (agent: RosterAgent, model?: string) => void;
  /** Supply only when the host can persist and apply effort selections. */
  onSelectEffort?: (
    agent: RosterAgent,
    model: string,
    effort: EffortChoice
  ) => void;
  onConnect: (agent: RosterAgent) => void;
  onCreate: () => void;
  onCloseAutoFocus?: (event: Event) => void;
};

export function AgentPicker(props: AgentPickerProps) {
  return (
    <div class="flex min-w-0 items-center gap-1">
      <Show when={isTouchDevice()} fallback={<DesktopAgentPicker {...props} />}>
        <MobileAgentPicker {...props} />
      </Show>
      <Show when={props.selected}>
        {(agent) => <AgentModelOverride {...props} agent={agent()} />}
      </Show>
    </div>
  );
}

/** The selected agent's harness models; a pick never changes the agent or its saved default. */
function AgentModelOverride(props: AgentPickerProps & { agent: RosterAgent }) {
  const catalog = createComposerModels(() => props.agent);
  const model = () =>
    props.modelOverride ?? props.agent.defaultModel ?? catalog.currentModel();
  const label = () =>
    [
      modelLabel(
        model(),
        catalog.models().find((option) => option.id === model())?.name
      ),
      props.effortLabel,
    ]
      .filter(Boolean)
      .join(' · ');
  return (
    <ModelSelector
      model={model()}
      label={label()}
      compact={isTouchDevice() && !props.showModelLabel}
      triggerClass={props.triggerClass}
      options={catalog.models().map((option) => ({
        id: option.id,
        name: option.name,
        description: option.description ?? undefined,
        group: option.group ?? undefined,
      }))}
      disabled={Boolean(props.agent.unavailableReason)}
      onCloseAutoFocus={props.onCloseAutoFocus}
      onSelect={(id) => props.onSelect(props.agent, id)}
      modelRow={
        props.onSelectEffort
          ? (row) => (
              <AgentModelMenuItem
                {...row}
                harness={props.agent.harness}
                effortValue={
                  row.selected ? props.effortSelection?.value : undefined
                }
                onSelectEffort={(effort) =>
                  props.onSelectEffort?.(props.agent, row.option.id, effort)
                }
              />
            )
          : undefined
      }
      emptyMessage={catalog.message()}
    />
  );
}

function DesktopAgentPicker(props: AgentPickerProps) {
  const [open, setOpen] = createSignal(false);
  const groups = () => agentPickerGroups(props.agents);
  return (
    <Dropdown open={open()} onOpenChange={setOpen} placement="top-end">
      <Dropdown.Trigger
        variant="ghost"
        aria-label="Agent"
        ref={tourTarget(AGENTS_TOUR.picker)}
        title={props.selected?.name ?? 'Choose agent'}
        class={cn(
          'h-[33.75px] min-w-0 max-w-full gap-[5.625px] px-[7.5px] text-base font-normal text-ink-muted light-mode:text-composer-placeholder',
          props.triggerClass
        )}
      >
        <Show
          when={props.selected}
          fallback={
            <span class="min-w-0 truncate text-left leading-5">
              Choose agent
            </span>
          }
        >
          {(agent) => (
            <>
              <AgentIcon agent={agent()} class="size-[15px] shrink-0" />
              <span class="min-w-0 truncate text-left leading-5">
                {agent().name}
              </span>
            </>
          )}
        </Show>
        <CaretDownIcon class="size-[15px] shrink-0" />
      </Dropdown.Trigger>
      <Dropdown.Content
        class="w-80 max-w-[calc(100vw-1rem)] overflow-hidden"
        onCloseAutoFocus={props.onCloseAutoFocus}
        onPointerDown={(event: PointerEvent) => event.stopPropagation()}
        onMouseDown={(event: MouseEvent) => event.stopPropagation()}
      >
        <div class="min-h-0 max-h-[min(28rem,var(--kb-popper-content-available-height))] space-y-1 overflow-y-auto overscroll-contain p-2">
          <For each={groups()}>
            {(group) => (
              <Dropdown.Group class="py-0">
                <Dropdown.GroupLabel class="h-6 font-medium text-ink-muted">
                  {group.label}
                </Dropdown.GroupLabel>
                <For each={group.agents}>
                  {(agent) => (
                    <Dropdown.Item
                      closeOnSelect
                      class="min-w-0 gap-3 py-2"
                      disabled={Boolean(
                        agent.unavailableReason && !agent.connectLabel
                      )}
                      title={agent.unavailableReason}
                      onSelect={() => {
                        if (agent.unavailableReason) props.onConnect(agent);
                        else props.onSelect(agent);
                      }}
                    >
                      <AgentPickerIdentity
                        agent={agent}
                        selected={agent.id === props.selected?.id}
                        model={
                          agent.id === props.selected?.id
                            ? props.modelOverride
                            : undefined
                        }
                      />
                    </Dropdown.Item>
                  )}
                </For>
              </Dropdown.Group>
            )}
          </For>
          <Show when={!props.loading && groups().length === 0}>
            <p role="status" class="px-3 py-2 text-sm text-ink-muted">
              No agents available
            </p>
          </Show>
          <Show when={props.loading}>
            <div role="status" class="px-3 py-2 text-xs text-ink-muted">
              Loading agents…
            </div>
          </Show>
          <Dropdown.Group class="items-end px-1.5 pt-1 pb-0">
            <Dropdown.Item
              closeOnSelect
              class={buttonClasses({
                variant: 'strong',
                size: 'sm',
                glass: false,
                class: 'w-auto gap-1.5 data-highlighted:overlay-hover',
              })}
              onSelect={props.onCreate}
            >
              <PlusIcon class="size-4" />
              Create agent
            </Dropdown.Item>
          </Dropdown.Group>
        </div>
      </Dropdown.Content>
    </Dropdown>
  );
}
