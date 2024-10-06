import styles from '@app/components/focused-view/focused-view.module.css'
import { Entities } from '@app/data'
import isEqual from 'lodash/isEqual'
import { diff, diffString } from 'json-diff'
import { BsArrowRight } from 'react-icons/bs'

interface Props {
  resource?: Entities.TerraformPlanResourceChange
}

export const C = (props: Props) => {
  const { resource } = props

  if (!resource) {
    return <div className={styles.container} />
  }

  return (
    <div className={styles.container}>
      <div className={styles.row}>
        <div className={styles.rowHeader}>Address</div>
        <div className={styles.rowBefore}>{resource.address}</div>
      </div>
      <Actions actions={resource.change.actions} />
      <ChangedFieldList change={resource.change} />
    </div>
  )
}

interface ActionsProps {
  actions: string[]
}

const Actions = (props: ActionsProps) => {
  const { actions } = props
  const actionElems: JSX.Element[] = []

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i]
    const colorClassName = getActionsColorClassName(action)

    actionElems.push(
      <span key={2 * i} className={colorClassName}>
        {action}
      </span>,
    )

    if (i !== actions.length - 1) {
      actionElems.push(<span key={2 * i + 1}>, </span>)
    }
  }

  return (
    <div className={styles.row}>
      <div className={styles.rowHeader}>Actions</div>
      <div className={styles.rowBefore}>[{actionElems}]</div>
    </div>
  )
}

const getActionsColorClassName = (action: string): string => {
  switch (action) {
    case Entities.TerraformPlanResourceChangeChangeAction.Create: {
      return styles.colorGreen
    }
    case Entities.TerraformPlanResourceChangeChangeAction.Update: {
      return styles.colorYellow
    }
    case Entities.TerraformPlanResourceChangeChangeAction.Delete: {
      return styles.colorRed
    }
    default: {
      return ''
    }
  }
}

interface ChangedFieldListProps {
  change: Entities.TerraformPlanResourceChangeChange
}

const ChangedFieldList = (props: ChangedFieldListProps) => {
  const { change } = props

  const actionAlias = Entities.Utils.TerraformPlanResourceChangeChange.getActionAlias(change)
  const diff = Entities.Utils.TerraformPlanResourceChangeChange.getDiff(change)

  return (
    <>
      {Object.keys(diff).map((field, key) => (
        <ChangedField key={key} field={field} changes={diff[field]} actionAlias={actionAlias} />
      ))}
    </>
  )
}

interface ChangedFieldProps {
  field: string
  changes: string[]
  actionAlias: Entities.TerraformPlanResourceChangeChangeActionAlias
}

const ChangedField = (props: ChangedFieldProps) => {
  const { field, changes, actionAlias } = props

  const beforeChange = changes[0]
  const afterChange = changes[changes.length - 1]

  const [beforeChangeColorClassName, afterChangeColorClassName] = getFieldChangeColorClassName(
    actionAlias,
  )

  if (isEqual(beforeChange, afterChange)) {
    return (
      <div className={styles.row}>
        <div className={styles.rowHeader}>{field}</div>
        <div className={`${styles.rowBefore}`}>
          <pre>{prettifyJson(beforeChange)}</pre>
        </div>
      </div>
    )
  }

  const [beforeJson, b] = tryParseJson(beforeChange);
  const [afterJson, a] = tryParseJson(afterChange);
  if (a && b) {
    // Deal with JSON parsing

    let jsonDiffString: string[] = []
    diffString(beforeJson, afterJson, { full: true }).split("\n")
    .forEach((line, index, array) => {
      if (/^.*\]$/.test(line)) return;
      if (index <= array.length-1 && /^.*\[$/.test(line) && /^.*\]$/.test(array[index+1])) {
        jsonDiffString.push(`${line}]`);
      }
      else jsonDiffString.push(line);
    })

    let beforeBuffer = [], afterBuffer = []
    const rows = []
    const remPattern = /^\-.*/, addPattern = /^\+.*/

    for (let i=0; i<jsonDiffString.length; i++) {
      const line = jsonDiffString[i];
      if (remPattern.test(line)) {
        beforeBuffer.push(line);
      }
      else if (addPattern.test(line)) {
        afterBuffer.push(line);
      }
      else {
        const totalRows = Math.max(beforeBuffer.length, afterBuffer.length)
        for (let i=0; i<totalRows; i++) {
          const beforeLine = (i < beforeBuffer.length ? beforeBuffer[i] : " ")
          const afterLine  = (i < afterBuffer.length  ? afterBuffer[i]  : " ")
          rows.push(
            <div className={styles.line}>
              <div className={`${styles.rowBefore} ${styles.colorRed}`}>
                <pre>{beforeLine}</pre>
              </div>
              <div className={styles.rowArrow}>
                <BsArrowRight />
              </div>
              <div className={`${styles.rowAfter} ${styles.colorGreen}`}>
                <pre>{afterLine}</pre>
              </div>
            </div>
          )
          beforeBuffer = []
          afterBuffer = []
        }

        rows.push(
          <div className={styles.line}>
            <div className={`${styles.rowBefore} ${styles.colorYellow}`}>
              <pre>{line}</pre>
            </div>
            <div className={styles.rowArrow}></div>
            <div className={`${styles.rowAfter} ${styles.colorYellow}`}>
              <pre>{line}</pre>
            </div>
          </div>
        )
      }
    } 

    return (
      <div className={styles.row}>
        <div className={styles.rowHeader}>{field}</div>
        <div>{rows}</div>
      </div>
    )
  }
  else {

    return (
      <div className={styles.row}>
        <div className={styles.rowHeader}>{field}</div>
        <div className={`${styles.rowBefore} ${beforeChangeColorClassName}`}>
          <pre>{prettifyJson(beforeChange)}</pre>
        </div>
        <div className={styles.rowArrow}>
          <BsArrowRight />
        </div>
        <div className={`${styles.rowAfter} ${afterChangeColorClassName}`}>
          <pre>{prettifyJson(afterChange)}</pre>
        </div>
      </div>
    )
  }

}

const getFieldChangeColorClassName = (
  actionAlias: Entities.TerraformPlanResourceChangeChangeActionAlias,
): [string, string] => {
  switch (actionAlias) {
    case Entities.TerraformPlanResourceChangeChangeActionAlias.Create:
      return [styles.colorGreen, styles.colorGreen]
    case Entities.TerraformPlanResourceChangeChangeActionAlias.Update:
      return [styles.colorYellow, styles.colorYellow]
    case Entities.TerraformPlanResourceChangeChangeActionAlias.Delete:
      return [styles.colorRed, styles.colorRed]
    case Entities.TerraformPlanResourceChangeChangeActionAlias.CreateDelete:
      return [styles.colorGreen, styles.colorRed]
    case Entities.TerraformPlanResourceChangeChangeActionAlias.DeleteCreate:
      return [styles.colorRed, styles.colorGreen]
    default:
      return [styles.colorYellow, styles.colorYellow]
  }
}

const prettifyJson = (input: string): string => {
  const [parsedJson, isValidJson] = tryParseJson(input)

  if (isValidJson) {
    return JSON.stringify(parsedJson, null, 2)
  }

  return JSON.stringify(input, null, 2)
}

const tryParseJson = (input: string): [{}, boolean] => {
  try {
    const parsedJson = JSON.parse(input)
    return [parsedJson, true]
  } catch (err) {
    return [{}, false]
  }
}
