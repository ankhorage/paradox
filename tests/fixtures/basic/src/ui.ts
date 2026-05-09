declare namespace JSX {
  interface Element {
    readonly type: string;
  }
}

/***
 * Props accepted by the fixture button.
 */
export interface ButtonProps {
  /***
   * Visible button label.
   */
  label: string;

  /***
   * Optional disabled state.
   */
  disabled?: boolean;
}

/***
 * Renders the fixture button component.
 *
 * @param props Props that configure the rendered button state.
 * @returns The rendered JSX element descriptor.
 */
export function Button(props: ButtonProps): JSX.Element {
  return {
    type: props.disabled ? 'disabled-button' : 'button',
  };
}

/***
 * Builds button props from raw inputs.
 *
 * @param label Visible button label.
 * @param disabled Whether the button should be disabled.
 * @returns A normalized button props object.
 */
export function createButtonState(label: string): ButtonProps;
export function createButtonState(label: string, disabled: boolean): ButtonProps;
export function createButtonState(label: string, disabled = false): ButtonProps {
  return {
    label,
    disabled,
  };
}
