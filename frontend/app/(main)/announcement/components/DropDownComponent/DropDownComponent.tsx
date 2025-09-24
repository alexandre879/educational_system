
import styles from "./DropDownComponent.module.scss";

const DropDownComponent = () => {
    return (
        <details className={styles.dropdown}>
            <summary role="button">
                <a className={styles.button}>Click on me!</a>
            </summary>
            <ul>
                <li><a href="#">I'm a dropdown.</a></li>
                <li><a href="#">In Pure CSS</a></li>
                <li><a href="#">As in...</a></li>
                <li><a href="#">No JavaScript.</a></li>
                <li><a href="#">At All.</a></li>
            </ul>
        </details>
    )
}

export default DropDownComponent;