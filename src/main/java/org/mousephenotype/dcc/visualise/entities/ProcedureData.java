/*
 * Copyright 2014 Medical Research Council Harwell.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.mousephenotype.dcc.visualise.entities;

import javax.xml.bind.annotation.XmlElement;

/**
 * The structure of the procedure data that is returned by the
 * ProcedureFacadeREST web service.
 *
 * @author gyaikhom
 */
public class ProcedureData {

    private Integer procedureId;
    private String stableid;
    private String procedureName;
    private String procedureCode;
    private Integer major;
    private Integer minor;

    public ProcedureData() {
    }

    public ProcedureData(Integer procedureId, String stableid,
            String procedureName, Integer major, Integer minor) {
        this.procedureId = procedureId;
        this.stableid = stableid;
        this.procedureName = procedureName;
        this.major = major;
        this.minor = minor;
    }

    @XmlElement(name = "i")
    public Integer getProcedureId() {
        return procedureId;
    }

    public void setProcedureId(Integer procedureId) {
        this.procedureId = procedureId;
    }

    @XmlElement(name = "k")
    public String getStableid() {
        return stableid;
    }

    public void setStableid(String stableid) {
        this.stableid = stableid;
    }

    @XmlElement(name = "n")
    public String getProcedureName() {
        return procedureName;
    }

    public void setProcedureName(String procedureName) {
        this.procedureName = procedureName;
    }

    @XmlElement(name = "c")
    public String getProcedureCode() {
        return procedureCode;
    }

    public void setProcedureCode(String procedureCode) {
        this.procedureCode = procedureCode;
    }

    @XmlElement(name = "M")
    public Integer getMajor() {
        return major;
    }

    public void setMajor(Integer major) {
        this.major = major;
    }

    @XmlElement(name = "m")
    public Integer getMinor() {
        return minor;
    }

    public void setMinor(Integer minor) {
        this.minor = minor;
    }
    
}
